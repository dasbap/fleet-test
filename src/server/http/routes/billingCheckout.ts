import type { Context, Hono } from "hono";
import { z } from "zod";
import { createBillingCheckoutForUser } from "@/server/domain/billingCheckout";
import { getPaymentProvider } from "@/server/env";
import { getBearerToken } from "@/server/http/auth";
import { jsonInternalServerError } from "@/server/http/errorResponse";
import { createSupabaseUserClient } from "@/server/infra/supabaseUserClient";

const checkoutBodySchema = z.object({
  orgId: z.string().uuid(),
  fleetId: z.string().uuid(),
  planCode: z.string().min(1),
  vehicleCount: z.number().int().positive(),
  durationMonths: z.number().int().positive().optional(),
  vehicleIds: z.array(z.string().uuid()).optional(),
});

async function handleBillingCheckout(c: Context) {
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
  const parsed = checkoutBodySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Données invalides", details: parsed.error.flatten() }, 400);
  }
  try {
    const supabase = createSupabaseUserClient(token);
    const result = await createBillingCheckoutForUser(
      supabase,
      parsed.data,
      getPaymentProvider(),
    );
    return c.json(result);
  } catch (e) {
    return jsonInternalServerError(c, e);
  }
}

export function registerBillingCheckoutRoutes(app: Hono) {
  app.post("/billing/checkout", handleBillingCheckout);
}
