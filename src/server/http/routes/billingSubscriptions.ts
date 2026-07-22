import type { Context, Hono } from "hono";
import { z } from "zod";
import { loadBillingSnapshotForUser } from "@/server/domain/billingSnapshot";
import { getBearerToken } from "@/server/http/auth";
import { jsonInternalServerError } from "@/server/http/errorResponse";
import { createSupabaseUserClient } from "@/server/infra/supabaseUserClient";

const billingQuerySchema = z.object({
  org_id: z.string().uuid(),
  fleet_id: z.string().uuid(),
});

async function handleBillingSubscriptions(c: Context) {
  const parsed = billingQuerySchema.safeParse({
    org_id: c.req.query("org_id"),
    fleet_id: c.req.query("fleet_id"),
  });
  if (!parsed.success) {
    return c.json({ error: "Paramètres invalides", details: parsed.error.flatten() }, 400);
  }
  const token = getBearerToken(c.req.header("Authorization"));
  if (!token) {
    return c.json({ error: "Authorization Bearer requis" }, 401);
  }
  try {
    const supabase = createSupabaseUserClient(token);
    const snapshot = await loadBillingSnapshotForUser(
      supabase,
      parsed.data.org_id,
      parsed.data.fleet_id,
    );
    return c.json(snapshot);
  } catch (e) {
    return jsonInternalServerError(c, e);
  }
}

export function registerBillingSubscriptionsRoutes(app: Hono) {
  app.get("/billing/subscriptions", handleBillingSubscriptions);
}

export function registerLegacyBillingSnapshotRoute(app: Hono) {
  app.get("/api/billing/snapshot", async (c) => {
    c.header("Deprecation", "true");
    c.header("Link", '</billing/subscriptions>; rel="successor-version"');
    return handleBillingSubscriptions(c);
  });
}
