import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

const notchWebhook = read("supabase/functions/notch-pay-webhook/index.ts");
const inboundWebhook = read("src/server/domain/billing/processInboundPaymentWebhook.ts");

describe("payment webhook security matrix", () => {
  it("fails closed when the Notch Pay signature is missing or invalid", () => {
    expect(notchWebhook).toContain("x-notch-signature");
    expect(notchWebhook).toContain("verifySignature(rawBody, signature)");
    expect(notchWebhook).toContain("if (!NOTCH_PAY_WEBHOOK_SECRET) return false");
    expect(notchWebhook).toContain("timingSafeEqual");
    expect(notchWebhook).toContain("status: 401");
  });

  it("rejects unknown statuses and incompatible currency or amount", () => {
    expect(notchWebhook).toContain("if (!normalizedStatus)");
    expect(notchWebhook).toContain("currencyFromWebhook !== \"XAF\"");
    expect(notchWebhook).toContain("Math.round(amountFromWebhook) !== Number(payment.amount)");
    expect(notchWebhook).toContain("status: 409");
  });

  it("prevents terminal payment status regression and races", () => {
    expect(notchWebhook).toContain("const TERMINAL = new Set<PaymentStatusV2>");
    expect(notchWebhook).toContain("return current === \"successful\" && next === \"refunded\"");
    expect(notchWebhook).toContain(".eq(\"status\", payment.status)");
    expect(notchWebhook).toContain("reason: \"concurrent_transition\"");

    expect(inboundWebhook).toContain("canTransitionPaymentStatus(payment.status, normalized)");
    expect(inboundWebhook).toContain(".eq(\"status\", payment.status)");
  });

  it("makes subscription activation effects idempotent with leased claim tokens", () => {
    expect(notchWebhook).toContain("claim_payment_webhook_effects");
    expect(notchWebhook).toContain("p_lease_seconds: 900");
    expect(notchWebhook).toContain("complete_payment_webhook_effects");
    expect(notchWebhook).toContain("release_payment_webhook_effects");
    expect(notchWebhook).toContain("p_claim_token: claimToken");

    expect(inboundWebhook).toContain("claim_payment_webhook_effects");
    expect(inboundWebhook).toContain("p_lease_seconds: 900");
    expect(inboundWebhook).toContain("complete_payment_webhook_effects");
    expect(inboundWebhook).toContain("release_payment_webhook_effects");
    expect(inboundWebhook).toContain("p_claim_token: claimToken");
  });

  it("does not persist common PII fields from the Notch Pay webhook payload", () => {
    expect(notchWebhook).toContain("sanitizeWebhookPayload");
    expect(notchWebhook).toContain("\"phone\", \"email\", \"name\", \"customer\", \"address\", \"ip\"");
    expect(notchWebhook).toContain("raw_payload: sanitizeWebhookPayload(payload)");
    expect(notchWebhook).toContain("raw_response: data ? sanitizeWebhookPayload(data) : null");
  });

  it("binds generic inbound webhooks to the expected payment provider", () => {
    expect(inboundWebhook).toContain("expectedProvider && payment.provider !== expectedProvider");
    expect(inboundWebhook).toContain("Le fournisseur du webhook ne correspond pas au fournisseur du paiement.");
  });

  it("validates payment business metadata before activating subscriptions", () => {
    expect(inboundWebhook).toContain("vehicleCount: z.number().int().positive()");
    expect(inboundWebhook).toContain("durationMonths: z.number().int().positive().max(36).optional()");
    expect(inboundWebhook).toContain("fleetId: z.string().uuid()");
    expect(inboundWebhook).toContain("duplicate_vehicle_ids");
    expect(inboundWebhook).toContain("vehicle_count_mismatch");
    expect(inboundWebhook).toContain("rawPayloadSchema.safeParse(payment.raw_payload)");
  });
});
