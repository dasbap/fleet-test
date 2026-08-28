import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20260826160000_payment_pending_confirmation_flow.sql",
  "utf8",
);
const domain = readFileSync("src/server/domain/notchPayInitiate.ts", "utf8");
const webRoute = readFileSync(
  "apps/esamba-web/src/app/api/payments/notchpay/initiate/route.ts",
  "utf8",
);
const webhook = readFileSync("supabase/functions/notch-pay-webhook/index.ts", "utf8");

describe("payment pending confirmation flow", () => {
  it("persiste un pending avant de contacter Notch Pay dans les deux chemins d'initiation", () => {
    const domainCreate = domain.indexOf("createServerOwnedPaymentIntent");
    const domainFetch = domain.indexOf("await fetch(`${NOTCH_PAY_API_URL}/payments`");
    const routeCreate = webRoute.indexOf('"create_payment_intent"');
    const routeFetch = webRoute.indexOf("await fetch(`${NOTCH_PAY_API_URL}/payments`");

    expect(domainCreate).toBeGreaterThan(-1);
    expect(domainFetch).toBeGreaterThan(domainCreate);
    expect(routeCreate).toBeGreaterThan(-1);
    expect(routeFetch).toBeGreaterThan(routeCreate);
  });

  it("lie la référence PSP après création locale et sait clôturer un pending échoué", () => {
    expect(migration).toContain("bind_payment_provider_reference");
    expect(migration).toContain("fail_payment_initiation");
    expect(migration).toContain("status IN ('initiated', 'pending', 'processing')");
    expect(migration).toContain("status = 'pending_payment'");
    expect(domain).toContain("bind_payment_provider_reference");
    expect(domain).toContain("fail_payment_initiation");
    expect(webRoute).toContain("bind_payment_provider_reference");
    expect(webRoute).toContain("fail_payment_initiation");
  });

  it("n'active les effets métier que sur confirmation successful du webhook signé", () => {
    const signatureCheck = webhook.indexOf("verifySignature(rawBody, signature)");
    const successGate = webhook.indexOf('normalizedStatus === "successful"');
    const activation = webhook.indexOf("activateSubscription(admin, payment)");

    expect(signatureCheck).toBeGreaterThan(-1);
    expect(successGate).toBeGreaterThan(signatureCheck);
    expect(activation).toBeGreaterThan(successGate);
  });
});