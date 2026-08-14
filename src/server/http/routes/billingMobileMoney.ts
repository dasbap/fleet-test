import type { Context, Hono } from "hono";
import { z } from "zod";
import { initiateMobileMoneyPaymentForUser } from "../../domain/mobileMoneyInitiate.js";
import { getBearerToken } from "../auth.js";
import { jsonInternalServerError } from "../errorResponse.js";
import { createSupabaseUserClient } from "../../infra/supabaseUserClient.js";

const momoIntentSchema = z.object({
  orgId: z.string().uuid(),
  fleetId: z.string().uuid(),
  provider: z.enum(["orange_money", "mtn_momo"]),
  phoneNumber: z.string().min(3),
  amountXaf: z.number().int().positive(),
  planCode: z.string().min(1),
  vehicleCount: z.number().int().nonnegative(),
  durationMonths: z.number().int().positive().optional(),
  vehicleIds: z.array(z.string().uuid()).optional(),
});

async function handleMobileMoneyInitiate(c: Context) {
  const token = getBearerToken(c.req.header("Authorization"));
  if (!token) {
    return c.json({ error: "Authorization Bearer requis" }, 401);
  }
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Corps JSON invalide" }, 400);
  }
  const parsed = momoIntentSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Données invalides", details: parsed.error.flatten() }, 400);
  }
  try {
    const supabase = createSupabaseUserClient(token);
    const result = await initiateMobileMoneyPaymentForUser(supabase, parsed.data);
    return c.json(result);
  } catch (e) {
    return jsonInternalServerError(c, e);
  }
}

export function registerBillingMobileMoneyRoutes(app: Hono) {
  app.post("/billing/mobile-money/initiate", handleMobileMoneyInitiate);
}

export function registerLegacyMobileMoneyRoute(app: Hono) {
  app.post("/api/payments/mobile-money/initiate", async (c) => {
    c.header("Deprecation", "true");
    c.header("Link", '</billing/mobile-money/initiate>; rel="successor-version"');
    return handleMobileMoneyInitiate(c);
  });
}
