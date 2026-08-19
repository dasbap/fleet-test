import type { Context, Hono } from "hono";
import { runInboundPaymentWebhook } from "../../domain/billing/processInboundPaymentWebhook.js";
import { getPaymentWebhookSecrets } from "../../env.js";
import { jsonInternalServerError } from "../errorResponse.js";
import { createSupabaseServiceClient } from "../../infra/supabaseServiceClient.js";
import { resolvePaymentWebhookProvider } from "../../payments/webhookProviders.js";

async function handleInboundPaymentWebhook(c: Context) {
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
    const expectedPaymentProvider = provider.id === "generic" ? "manual" : provider.id;
    await runInboundPaymentWebhook(admin, externalRef, rawStatus, expectedPaymentProvider);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur serveur";
    if (msg.includes("introuvable pour cette référence")) {
      return c.json({ error: msg }, 404);
    }
    if (msg.includes("fournisseur du webhook")) {
      return c.json({ error: "Webhook incompatible avec ce paiement" }, 409);
    }
    return jsonInternalServerError(c, e);
  }
  return c.body(null, 204);
}

export function registerWebhooksPaymentRoutes(app: Hono) {
  app.post("/webhooks/payment", handleInboundPaymentWebhook);
}

export function registerLegacyWebhooksPaymentRoutes(app: Hono) {
  app.post("/api/webhooks/payments/inbound", async (c) => {
    c.header("Deprecation", "true");
    c.header("Link", '</webhooks/payment>; rel="successor-version"');
    return handleInboundPaymentWebhook(c);
  });
}
