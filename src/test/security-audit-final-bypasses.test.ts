import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

const migration = read("supabase/migrations/20260820102000_close_security_audit_bypasses.sql");
const notchWebhook = read("supabase/functions/notch-pay-webhook/index.ts");
const paymentWebhook = read("src/server/domain/billing/processInboundPaymentWebhook.ts");

describe("final security audit bypass closure", () => {
  it("removes implicit PUBLIC execution from privileged subscription helpers", () => {
    expect(migration).toContain("assign_vehicle_to_subscription(uuid, uuid, uuid)");
    expect(migration).toContain("find_available_subscription_for_vehicle(uuid)");
    expect(migration).toContain("FROM PUBLIC, anon, authenticated");
    expect(migration).toContain("TO service_role");
  });

  it("serializes successful payment side effects with a service-role-only lease", () => {
    expect(migration).toContain("payment_webhook_effect_claims");
    expect(migration).toContain("claim_payment_webhook_effects");
    expect(migration).toContain("complete_payment_webhook_effects");
    expect(migration).toContain("release_payment_webhook_effects");
    expect(migration).toContain("auth.role() <> 'service_role'");
    expect(paymentWebhook).toContain('.eq("status", payment.status)');
    expect(paymentWebhook).toContain('"effects_in_progress_or_done"');
  });

  it("blocks mismatched Notch amounts and preserves status progression", () => {
    expect(notchWebhook).toContain("Montant webhook incompatible avec le paiement");
    expect(notchWebhook).toContain("Math.round(amountFromWebhook) !== Number(payment.amount)");
    expect(notchWebhook).toContain("existingAttempt?.status === normalizedStatus");
    expect(notchWebhook).toContain("concurrent_transition");
    expect(notchWebhook).toContain("claim_payment_webhook_effects");
  });
});
