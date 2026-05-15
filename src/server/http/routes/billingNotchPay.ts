import type { Context, Hono } from "hono";
import { z } from "zod";
import { initiateNotchPayPayment } from "@/server/domain/notchPayInitiate";
import { getBearerToken } from "@/server/http/auth";
import { createSupabaseUserClient } from "@/server/infra/supabaseUserClient";

const notchIntentSchema = z.object({
  orgId: z.string().uuid(),
  fleetId: z.string().uuid(),
  planCode: z.string().min(1),
  vehicleCount: z.number().int().positive(),
  durationMonths: z.number().int().positive().optional(),
  vehicleIds: z.array(z.string().uuid()).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(6).optional(),
});

async function handleNotchPayInitiate(c: Context) {
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
  const parsed = notchIntentSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Données invalides", details: parsed.error.flatten() }, 400);
  }
  try {
    const supabase = createSupabaseUserClient(token);
    const result = await initiateNotchPayPayment(supabase, parsed.data);
    return c.json(result, 201);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur serveur";
    return c.json({ error: msg }, 500);
  }
}

export function registerBillingNotchPayRoutes(app: Hono) {
  app.post("/billing/notch/initiate", handleNotchPayInitiate);
}
