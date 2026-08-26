import type { Context, Hono } from "hono";
import { z } from "zod";
import { initiateNotchPayPayment } from "../../domain/notchPayInitiate.js";
import { reconcileNotchPayPayment } from "../../domain/reconcileNotchPayPayment.js";
import type { NotchPayIntent } from "../../../types/notch-pay.js";
import { getBearerToken } from "../auth.js";
import { jsonInternalServerError } from "../errorResponse.js";
import { createSupabaseUserClient } from "../../infra/supabaseUserClient.js";
import { rateLimit } from "../middleware/rateLimitMiddleware.js";

const notchIntentSchema = z.object({
  orgId: z.string().uuid(),
  fleetId: z.string().uuid(),
  planCode: z.string().trim().min(1).max(100),
  vehicleCount: z.number().int().positive(),
  durationMonths: z.number().int().positive().max(36).optional(),
  vehicleIds: z.array(z.string().uuid()).optional(),
  email: z.string().email().max(320).optional(),
  phone: z.string().min(6).max(64).optional(),
});

const notchReconcileSchema = z.object({
  orgId: z.string().uuid(),
  fleetId: z.string().uuid(),
  merchantRef: z.string().trim().min(1).max(160),
});

async function handleNotchPayInitiate(c: Context) {
  const token = getBearerToken(c.req.header("Authorization"));
  if (!token) return c.json({ error: "Authorization Bearer requis" }, 401);

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
    const intent = parsed.data as NotchPayIntent;
    const result = await initiateNotchPayPayment(supabase, intent);
    return c.json(result, 201);
  } catch (e) {
    return jsonInternalServerError(c, e);
  }
}

async function handleNotchPayReconcile(c: Context) {
  const token = getBearerToken(c.req.header("Authorization"));
  if (!token) return c.json({ error: "Authorization Bearer requis" }, 401);

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Corps JSON invalide" }, 400);
  }

  const parsed = notchReconcileSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Données invalides", details: parsed.error.flatten() }, 400);
  }

  try {
    const supabase = createSupabaseUserClient(token);
    const result = await reconcileNotchPayPayment(supabase, parsed.data);
    return c.json(result, 200);
  } catch (e) {
    return jsonInternalServerError(c, e);
  }
}

const billingRateLimit = rateLimit({ maxRequests: 5, windowMs: 60_000 });

export function registerBillingNotchPayRoutes(app: Hono) {
  app.post("/billing/notch/initiate", billingRateLimit, handleNotchPayInitiate);
  app.post("/billing/notch/reconcile", billingRateLimit, handleNotchPayReconcile);
}
