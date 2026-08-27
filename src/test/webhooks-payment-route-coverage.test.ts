import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

const runInboundPaymentWebhook = vi.fn();
const createSupabaseServiceClient = vi.fn();
const getPaymentWebhookSecrets = vi.fn();
const verify = vi.fn();
const parse = vi.fn();
const resolvePaymentWebhookProvider = vi.fn();

vi.mock("@/server/domain/billing/processInboundPaymentWebhook", () => ({
  runInboundPaymentWebhook: (...args: unknown[]) => runInboundPaymentWebhook(...args),
}));

vi.mock("@/server/infra/supabaseServiceClient", () => ({
  createSupabaseServiceClient: () => createSupabaseServiceClient(),
}));

vi.mock("@/server/env", () => ({
  getPaymentWebhookSecrets: () => getPaymentWebhookSecrets(),
}));

vi.mock("@/server/payments/webhookProviders", () => ({
  resolvePaymentWebhookProvider: (...args: unknown[]) => resolvePaymentWebhookProvider(...args),
}));

import {
  registerLegacyWebhooksPaymentRoutes,
  registerWebhooksPaymentRoutes,
} from "@/server/http/routes/webhooksPayment";

function createApp() {
  const app = new Hono();
  registerWebhooksPaymentRoutes(app);
  registerLegacyWebhooksPaymentRoutes(app);
  return app;
}

function provider(id = "generic") {
  return { id, verify, parse };
}

function validRequestHeaders(extra: Record<string, string> = {}) {
  return {
    "Content-Type": "application/json",
    "x-payments-webhook-secret": "secret",
    ...extra,
  };
}

describe("payment webhook route coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPaymentWebhookSecrets.mockReturnValue({ paymentsWebhookSecret: "secret" });
    createSupabaseServiceClient.mockReturnValue({ rpc: vi.fn() });
    resolvePaymentWebhookProvider.mockReturnValue(provider());
    parse.mockReturnValue({ externalRef: "pay-1", rawStatus: "success" });
    runInboundPaymentWebhook.mockResolvedValue(undefined);
  });

  it.each(["-1", "1.5", "NaN"])("rejects invalid Content-Length %s", async (value) => {
    const response = await createApp().request("/webhooks/payment", {
      method: "POST",
      headers: { ...validRequestHeaders(), "Content-Length": value },
      body: "{}",
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Content-Length invalide" });
    expect(resolvePaymentWebhookProvider).not.toHaveBeenCalled();
  });

  it("rejects oversized Content-Length before reading the body", async () => {
    const response = await createApp().request("/webhooks/payment", {
      method: "POST",
      headers: { ...validRequestHeaders(), "Content-Length": String(64 * 1024 + 1) },
      body: "{}",
    });

    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ error: "Payload webhook trop volumineux" });
  });

  it("rejects an oversized actual body", async () => {
    const response = await createApp().request("/webhooks/payment", {
      method: "POST",
      headers: validRequestHeaders(),
      body: "x".repeat(64 * 1024 + 1),
    });

    expect(response.status).toBe(413);
  });

  it("uses the explicit provider hint when present", async () => {
    const response = await createApp().request("/webhooks/payment", {
      method: "POST",
      headers: validRequestHeaders({ "x-psp-provider": " cinetpay " }),
      body: "{}",
    });

    expect(response.status).toBe(204);
    expect(resolvePaymentWebhookProvider).toHaveBeenCalledWith("cinetpay");
  });

  it.each([
    ["x-notch-signature", "notch"],
    ["x-cinetpay-signature", "cinetpay"],
  ])("infers provider from %s", async (headerName, expectedProvider) => {
    const response = await createApp().request("/webhooks/payment", {
      method: "POST",
      headers: validRequestHeaders({ [headerName]: "signature" }),
      body: "{}",
    });

    expect(response.status).toBe(204);
    expect(resolvePaymentWebhookProvider).toHaveBeenCalledWith(expectedProvider);
  });

  it("falls back to generic provider without a hint", async () => {
    const response = await createApp().request("/webhooks/payment", {
      method: "POST",
      headers: validRequestHeaders(),
      body: "{}",
    });

    expect(response.status).toBe(204);
    expect(resolvePaymentWebhookProvider).toHaveBeenCalledWith(undefined);
  });

  it("returns 401 when provider verification fails", async () => {
    verify.mockImplementationOnce(() => {
      throw new Error("bad signature");
    });

    const response = await createApp().request("/webhooks/payment", {
      method: "POST",
      headers: validRequestHeaders(),
      body: "{}",
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Non autorisé" });
    expect(parse).not.toHaveBeenCalled();
  });

  it("returns the provider parse error", async () => {
    parse.mockImplementationOnce(() => {
      throw new Error("Champs external_ref et status requis");
    });

    const response = await createApp().request("/webhooks/payment", {
      method: "POST",
      headers: validRequestHeaders(),
      body: "{}",
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Champs external_ref et status requis" });
  });

  it("returns the generic parse error for non-Error throws", async () => {
    parse.mockImplementationOnce(() => {
      throw "invalid";
    });

    const response = await createApp().request("/webhooks/payment", {
      method: "POST",
      headers: validRequestHeaders(),
      body: "{}",
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Requête invalide" });
  });

  it("returns 503 when service-role client is unavailable", async () => {
    createSupabaseServiceClient.mockReturnValueOnce(null);

    const response = await createApp().request("/webhooks/payment", {
      method: "POST",
      headers: validRequestHeaders(),
      body: "{}",
    });

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: "Service role non configuré (SUPABASE_SERVICE_ROLE_KEY)",
    });
  });

  it.each([
    ["generic", "manual"],
    ["notch", "notch"],
    ["cinetpay", "cinetpay"],
  ])("passes expected payment provider for %s", async (providerId, expected) => {
    resolvePaymentWebhookProvider.mockReturnValueOnce(provider(providerId));

    const response = await createApp().request("/webhooks/payment", {
      method: "POST",
      headers: validRequestHeaders(),
      body: "{}",
    });

    expect(response.status).toBe(204);
    expect(runInboundPaymentWebhook).toHaveBeenCalledWith(
      expect.anything(),
      "pay-1",
      "success",
      expected,
    );
  });

  it("maps missing payment to 404", async () => {
    runInboundPaymentWebhook.mockRejectedValueOnce(
      new Error("Paiement introuvable pour cette référence"),
    );

    const response = await createApp().request("/webhooks/payment", {
      method: "POST",
      headers: validRequestHeaders(),
      body: "{}",
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Paiement introuvable pour cette référence" });
  });

  it("maps incompatible provider to 409", async () => {
    runInboundPaymentWebhook.mockRejectedValueOnce(new Error("fournisseur du webhook incorrect"));

    const response = await createApp().request("/webhooks/payment", {
      method: "POST",
      headers: validRequestHeaders(),
      body: "{}",
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "Webhook incompatible avec ce paiement" });
  });

  it("returns 500 for unexpected processing errors", async () => {
    runInboundPaymentWebhook.mockRejectedValueOnce(new Error("database unavailable"));

    const response = await createApp().request("/webhooks/payment", {
      method: "POST",
      headers: validRequestHeaders(),
      body: "{}",
    });

    expect(response.status).toBe(500);
  });

  it("sets deprecation headers on the legacy route", async () => {
    const response = await createApp().request("/api/webhooks/payments/inbound", {
      method: "POST",
      headers: validRequestHeaders(),
      body: "{}",
    });

    expect(response.status).toBe(204);
    expect(response.headers.get("deprecation")).toBe("true");
    expect(response.headers.get("link")).toBe('</webhooks/payment>; rel="successor-version"');
  });
});
