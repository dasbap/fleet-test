import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";
import { runInboundPaymentWebhook } from "@/server/domain/billing/processInboundPaymentWebhook";
import { loadBillingSnapshotForUser } from "@/server/domain/billingSnapshot";
import { initiateMobileMoneyPaymentForUser } from "@/server/domain/mobileMoneyInitiate";
import { getPaymentWebhookSecrets } from "@/server/env";
import { createSupabaseServiceClient } from "@/server/infra/supabaseServiceClient";
import { createSupabaseUserClient } from "@/server/infra/supabaseUserClient";
import { resolvePaymentWebhookProvider } from "@/server/payments/webhookProviders";

const billingQuerySchema = z.object({
  org_id: z.string().uuid(),
  fleet_id: z.string().uuid(),
});

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

function getBearerToken(header: string | undefined): string | null {
  if (!header?.startsWith("Bearer ")) return null;
  const t = header.slice(7).trim();
  return t.length ? t : null;
}

export function createServerApp() {
  const app = new Hono();

  app.use(
    "*",
    cors({
      origin: (origin) => origin ?? "*",
      allowHeaders: [
        "Authorization",
        "Content-Type",
        "x-payments-webhook-secret",
        "x-psp-provider",
        "x-notch-signature",
        "x-cinetpay-signature",
      ],
      allowMethods: ["GET", "POST", "OPTIONS"],
    }),
  );

  app.get("/health", (c) => c.json({ ok: true, service: "smart-fleet-bff" }));

  app.get("/api/billing/snapshot", async (c) => {
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
      const msg = e instanceof Error ? e.message : "Erreur serveur";
      return c.json({ error: msg }, 500);
    }
  });

  app.post("/api/payments/mobile-money/initiate", async (c) => {
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
      const msg = e instanceof Error ? e.message : "Erreur serveur";
      return c.json({ error: msg }, 500);
    }
  });

  app.post("/api/webhooks/payments/inbound", async (c) => {
    const rawBody = await c.req.text();
    const provider = resolvePaymentWebhookProvider(c.req.header("x-psp-provider"));
    const secrets = getPaymentWebhookSecrets();
    try {
      provider.verify(rawBody, (name) => c.req.header(name) ?? undefined, secrets);
    } catch {
      return c.json({ error: "Non autorisé" }, 401);
    }
    let externalRef: string;
    let rawStatus: string;
    try {
      const parsed = provider.parse(rawBody);
      externalRef = parsed.externalRef;
      rawStatus = parsed.rawStatus;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Requête invalide";
      return c.json({ error: msg }, 400);
    }
    const admin = createSupabaseServiceClient();
    if (!admin) {
      return c.json({ error: "Service role non configuré (SUPABASE_SERVICE_ROLE_KEY)" }, 503);
    }
    try {
      await runInboundPaymentWebhook(admin, externalRef, rawStatus);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur serveur";
      if (msg.includes("introuvable pour cette référence")) {
        return c.json({ error: msg }, 404);
      }
      return c.json({ error: msg }, 500);
    }
    return c.body(null, 204);
  });

  return app;
}

export function startBffServer() {
  const app = createServerApp();
  const port = Number(process.env.BFF_PORT || process.env.PORT || 8787);
  serve({ fetch: app.fetch, port }, (info) => {
    console.info(`[BFF] écoute sur http://127.0.0.1:${info.port}`);
  });
}
