import type { Context, Hono } from "hono";
import { z } from "zod";
import { initiateNotchPayPayment } from "../../domain/notchPayInitiate.js";
import { getBearerToken } from "../auth.js";
import { jsonInternalServerError } from "../errorResponse.js";
import { createSupabaseUserClient } from "../../infra/supabaseUserClient.js";
import { rateLimit } from "../middleware/rateLimitMiddleware.js";

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
    return jsonInternalServerError(c, e);
  }
}

// Rate limit : 5 initiations/minute/IP — protection anti-spam Notch Pay
const billingRateLimit = rateLimit({ maxRequests: 5, windowMs: 60_000 });

export function registerBillingNotchPayRoutes(app: Hono) {
  app.post("/billing/notch/initiate", billingRateLimit, handleNotchPayInitiate);
}
