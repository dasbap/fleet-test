/** @vitest-environment node */
import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  cinetpayWebhookProvider,
  genericSharedSecretWebhookProvider,
  notchPayWebhookProvider,
  resolvePaymentWebhookProvider,
} from "@/server/payments/webhookProviders";

function hmac(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body, "utf8").digest("hex");
}

describe("webhookProviders", () => {
  it("résout notch / cinetpay / generic", () => {
    expect(resolvePaymentWebhookProvider("notch").id).toBe("notch");
    expect(resolvePaymentWebhookProvider("cinet_pay").id).toBe("cinetpay");
    expect(resolvePaymentWebhookProvider(undefined).id).toBe("generic");
  });

  it("generic : exige le secret partagé", () => {
    const body = JSON.stringify({ external_ref: "r1", status: "succeeded" });
    genericSharedSecretWebhookProvider.verify(body, (n) => (n === "x-payments-webhook-secret" ? "abc" : undefined), {
      paymentsWebhookSecret: "abc",
    });
    expect(() =>
      genericSharedSecretWebhookProvider.verify(body, () => undefined, { paymentsWebhookSecret: "abc" }),
    ).toThrow();
  });

  it("notch : vérifie la signature HMAC", () => {
    const secret = "notch-test-secret";
    const body = JSON.stringify({ external_ref: "ref-x", status: "succeeded" });
    const sig = hmac(secret, body);
    notchPayWebhookProvider.verify(body, (n) => (n === "x-notch-signature" ? sig : undefined), {
      notchWebhookSecret: secret,
    });
    expect(() =>
      notchPayWebhookProvider.verify(body, (n) => (n === "x-notch-signature" ? "bad" : undefined), {
        notchWebhookSecret: secret,
      }),
    ).toThrow();
  });

  it("cinetpay : vérifie la signature HMAC", () => {
    const secret = "cinet-test";
    const body = JSON.stringify({ external_ref: "r2", status: "paid" });
    const sig = hmac(secret, body);
    cinetpayWebhookProvider.verify(body, (n) => (n === "x-cinetpay-signature" ? sig : undefined), {
      cinetpayWebhookSecret: secret,
    });
  });
});
