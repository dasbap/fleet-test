import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

const inboundBodySchema = z.object({
  external_ref: z.string().min(1),
  status: z.string().min(1),
});

const notchWebhookBodySchema = z.object({
  event: z.string().optional(),
  data: z.object({
    reference: z.string().min(1),
    status: z.string().min(1),
  }),
});

export type PspWebhookProviderId = "generic" | "notch" | "cinetpay";

export interface PaymentWebhookProvider {
  readonly id: PspWebhookProviderId;
  verify(rawBody: string, getHeader: (name: string) => string | undefined, getSecret: PaymentWebhookSecrets): void;
  parse(rawBody: string): { externalRef: string; rawStatus: string };
}

export interface PaymentWebhookSecrets {
  paymentsWebhookSecret?: string;
  notchWebhookSecret?: string;
  cinetpayWebhookSecret?: string;
}

function parseInboundJson(rawBody: string): { externalRef: string; rawStatus: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody) as unknown;
  } catch {
    throw new Error("Corps JSON invalide");
  }
  const r = inboundBodySchema.safeParse(parsed);
  if (!r.success) {
    throw new Error("Champs external_ref et status requis");
  }
  return { externalRef: r.data.external_ref, rawStatus: r.data.status };
}

function safeEqualUtf8(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

function safeEqualHex(a: string, b: string): boolean {
  if (!/^[0-9a-f]{64}$/i.test(a) || !/^[0-9a-f]{64}$/i.test(b)) return false;
  const ba = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

function hmacSha256Hex(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload, "utf8").digest("hex");
}

export const genericSharedSecretWebhookProvider: PaymentWebhookProvider = {
  id: "generic",
  verify(_rawBody, getHeader, secrets) {
    const expected = secrets.paymentsWebhookSecret?.trim();
    const got = getHeader("x-payments-webhook-secret")?.trim();
    if (!expected || !got || !safeEqualUtf8(got, expected)) {
      throw new Error("Non autorisé");
    }
  },
  parse: parseInboundJson,
};

export const notchPayWebhookProvider: PaymentWebhookProvider = {
  id: "notch",
  verify(rawBody, getHeader, secrets) {
    const secret = secrets.notchWebhookSecret?.trim();
    if (!secret) throw new Error("NOTCH_PAY_WEBHOOK_SECRET non configuré");
    const sig = getHeader("x-notch-signature")?.trim();
    if (!sig) throw new Error("Signature Notch manquante (x-notch-signature)");
    const expected = hmacSha256Hex(secret, rawBody);
    if (!safeEqualHex(sig, expected)) {
      throw new Error("Signature Notch invalide");
    }
  },
  parse(rawBody) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody) as unknown;
    } catch {
      throw new Error("Corps JSON invalide");
    }
    const notch = notchWebhookBodySchema.safeParse(parsed);
    if (notch.success) {
      return {
        externalRef: notch.data.data.reference,
        rawStatus: notch.data.data.status,
      };
    }
    const generic = inboundBodySchema.safeParse(parsed);
    if (generic.success) {
      return { externalRef: generic.data.external_ref, rawStatus: generic.data.status };
    }
    throw new Error("Format webhook Notch Pay non reconnu (reference + status requis)");
  },
};

export const cinetpayWebhookProvider: PaymentWebhookProvider = {
  id: "cinetpay",
  verify(rawBody, getHeader, secrets) {
    const secret = secrets.cinetpayWebhookSecret?.trim();
    if (!secret) throw new Error("CINETPAY_WEBHOOK_SECRET non configuré");
    const sig = getHeader("x-cinetpay-signature")?.trim();
    if (!sig) throw new Error("Signature CinetPay manquante (x-cinetpay-signature)");
    const expected = hmacSha256Hex(secret, rawBody);
    if (!safeEqualHex(sig, expected)) {
      throw new Error("Signature CinetPay invalide");
    }
  },
  parse: parseInboundJson,
};

const PROVIDERS: Record<PspWebhookProviderId, PaymentWebhookProvider> = {
  generic: genericSharedSecretWebhookProvider,
  notch: notchPayWebhookProvider,
  cinetpay: cinetpayWebhookProvider,
};

export function resolvePaymentWebhookProvider(headerValue: string | undefined): PaymentWebhookProvider {
  const id = (headerValue ?? "generic").trim().toLowerCase();
  if (id === "notch" || id === "notchpay") return PROVIDERS.notch;
  if (id === "cinetpay" || id === "cinet_pay") return PROVIDERS.cinetpay;
  return PROVIDERS.generic;
}
