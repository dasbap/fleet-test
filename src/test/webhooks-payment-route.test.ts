/** @vitest-environment node */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";

const verifyMock = vi.fn();
const parseMock = vi.fn(() => ({ externalRef: "ref-replay-1", rawStatus: "succeeded" }));
const runInboundMock = vi.fn(async () => ({
  paymentId: "pay-1",
  normalizedStatus: "succeeded",
  subscriptionActivated: false,
}));

vi.mock("@/server/payments/webhookProviders", () => ({
  resolvePaymentWebhookProvider: () => ({
    id: "generic",
    verify: verifyMock,
    parse: parseMock,
  }),
}));

vi.mock("@/server/env", () => ({
  getPaymentWebhookSecrets: () => ({
    generic: "secret-test",
    notch: "secret-test",
    cinetpay: "secret-test",
  }),
}));

vi.mock("@/server/infra/supabaseServiceClient", () => ({
  createSupabaseServiceClient: () => ({ from: vi.fn() }),
}));

vi.mock("@/server/domain/billing/processInboundPaymentWebhook", () => ({
  runInboundPaymentWebhook: runInboundMock,
}));

describe("route /webhooks/payment", () => {
  beforeEach(() => {
    verifyMock.mockClear();
    parseMock.mockClear();
    runInboundMock.mockClear();
  });

  it("accepte le replay idempotent et lie le webhook generic aux paiements manual", async () => {
    const { registerWebhooksPaymentRoutes } = await import("@/server/http/routes/webhooksPayment");
    const app = new Hono();
    registerWebhooksPaymentRoutes(app);

    const body = JSON.stringify({ external_ref: "ref-replay-1", status: "succeeded" });
    const headers = {
      "Content-Type": "application/json",
      "x-payments-webhook-secret": "secret-test",
    };

    const first = await app.request("/webhooks/payment", { method: "POST", headers, body });
    const second = await app.request("/webhooks/payment", { method: "POST", headers, body });

    expect(first.status).toBe(204);
    expect(second.status).toBe(204);
    expect(runInboundMock).toHaveBeenCalledTimes(2);
    expect(runInboundMock).toHaveBeenNthCalledWith(
      1,
      expect.any(Object),
      "ref-replay-1",
      "succeeded",
      "manual",
    );
    expect(runInboundMock).toHaveBeenNthCalledWith(
      2,
      expect.any(Object),
      "ref-replay-1",
      "succeeded",
      "manual",
    );
  });

  it("rejette un corps surdimensionne avant verification de signature", async () => {
    const { registerWebhooksPaymentRoutes } = await import("@/server/http/routes/webhooksPayment");
    const app = new Hono();
    registerWebhooksPaymentRoutes(app);

    const body = "x".repeat(64 * 1024 + 1);
    const res = await app.request("/webhooks/payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-payments-webhook-secret": "secret-test",
      },
      body,
    });

    expect(res.status).toBe(413);
    expect(verifyMock).not.toHaveBeenCalled();
    expect(parseMock).not.toHaveBeenCalled();
    expect(runInboundMock).not.toHaveBeenCalled();
  });
});
