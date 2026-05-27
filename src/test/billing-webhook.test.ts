import { describe, it, expect } from "vitest";
import {
  normalizeInboundPaymentStatus,
  canTransitionPaymentStatus,
  isTerminalPaymentStatus,
} from "@/lib/billing/paymentStates";
import { isSubscriptionAccessible } from "@/types/billing-production";
import type { SubscriptionStatus } from "@/types/billing-production";

// ─── Normalisation statuts paiement ────────────────────────

describe("normalizeInboundPaymentStatus", () => {
  it("reconnaît les alias de succès Notch Pay", () => {
    expect(normalizeInboundPaymentStatus("complete")).toBe("succeeded");
    expect(normalizeInboundPaymentStatus("completed")).toBe("succeeded");
    expect(normalizeInboundPaymentStatus("successful")).toBe("succeeded");
    expect(normalizeInboundPaymentStatus("paid")).toBe("succeeded");
    expect(normalizeInboundPaymentStatus("SUCCEEDED")).toBe("succeeded");
  });

  it("reconnaît les statuts d'échec", () => {
    expect(normalizeInboundPaymentStatus("failed")).toBe("failed");
    expect(normalizeInboundPaymentStatus("declined")).toBe("failed");
    expect(normalizeInboundPaymentStatus("rejected")).toBe("failed");
  });

  it("reconnaît les statuts en cours", () => {
    expect(normalizeInboundPaymentStatus("pending")).toBe("pending");
    expect(normalizeInboundPaymentStatus("processing")).toBe("processing");
    expect(normalizeInboundPaymentStatus("in_progress")).toBe("processing");
  });

  it("reconnaît annulé et remboursé", () => {
    expect(normalizeInboundPaymentStatus("cancelled")).toBe("canceled");
    expect(normalizeInboundPaymentStatus("canceled")).toBe("canceled");
    expect(normalizeInboundPaymentStatus("refunded")).toBe("refunded");
  });

  it("retourne null pour statut inconnu", () => {
    expect(normalizeInboundPaymentStatus("unknown_status")).toBeNull();
    expect(normalizeInboundPaymentStatus("")).toBeNull();
    expect(normalizeInboundPaymentStatus("foobar")).toBeNull();
  });
});

// ─── Transitions statuts paiement ──────────────────────────

describe("canTransitionPaymentStatus", () => {
  it("autorise la transition depuis un état non terminal", () => {
    expect(canTransitionPaymentStatus("pending", "succeeded")).toBe(true);
    expect(canTransitionPaymentStatus("initiated", "processing")).toBe(true);
    expect(canTransitionPaymentStatus("processing", "succeeded")).toBe(true);
    expect(canTransitionPaymentStatus(null, "succeeded")).toBe(true);
  });

  it("autorise la même valeur (idempotence webhook)", () => {
    expect(canTransitionPaymentStatus("succeeded", "succeeded")).toBe(true);
    expect(canTransitionPaymentStatus("failed", "failed")).toBe(true);
  });

  it("bloque la régression depuis un état terminal", () => {
    expect(canTransitionPaymentStatus("succeeded", "failed")).toBe(false);
    expect(canTransitionPaymentStatus("succeeded", "pending")).toBe(false);
    expect(canTransitionPaymentStatus("failed", "succeeded")).toBe(false);
  });

  it("autorise succeeded → refunded", () => {
    expect(canTransitionPaymentStatus("succeeded", "refunded")).toBe(true);
  });
});

// ─── États terminaux ───────────────────────────────────────

describe("isTerminalPaymentStatus", () => {
  it("identifie les états terminaux", () => {
    expect(isTerminalPaymentStatus("succeeded")).toBe(true);
    expect(isTerminalPaymentStatus("failed")).toBe(true);
    expect(isTerminalPaymentStatus("refunded")).toBe(true);
    expect(isTerminalPaymentStatus("canceled")).toBe(true);
  });

  it("identifie les états non terminaux", () => {
    expect(isTerminalPaymentStatus("pending")).toBe(false);
    expect(isTerminalPaymentStatus("initiated")).toBe(false);
    expect(isTerminalPaymentStatus("processing")).toBe(false);
  });
});

// ─── Accès abonnement ──────────────────────────────────────

describe("isSubscriptionAccessible", () => {
  const accessible: SubscriptionStatus[] = ["trial", "active", "grace_period"];
  const blocked: SubscriptionStatus[] = ["pending_payment", "suspended", "expired", "cancelled"];

  accessible.forEach((status) => {
    it(`donne accès pour le statut "${status}"`, () => {
      expect(isSubscriptionAccessible(status)).toBe(true);
    });
  });

  blocked.forEach((status) => {
    it(`bloque l'accès pour le statut "${status}"`, () => {
      expect(isSubscriptionAccessible(status)).toBe(false);
    });
  });
});

// ─── Payload webhook Notch Pay (format réel) ───────────────

describe("Format payload webhook Notch Pay", () => {
  const VALID_PAYLOAD = {
    event: "payment.complete",
    data: {
      reference: "pay_abc123",
      status: "complete",
      amount: 15000,
      currency: "XAF",
      phone: "+237600000000",
    },
  };

  it("extrait reference et status depuis data", () => {
    const ref = VALID_PAYLOAD.data.reference;
    const status = normalizeInboundPaymentStatus(VALID_PAYLOAD.data.status);
    expect(ref).toBe("pay_abc123");
    expect(status).toBe("succeeded");
  });

  it("valide la devise XAF", () => {
    expect(VALID_PAYLOAD.data.currency).toBe("XAF");
  });

  it("rejette une devise non supportée", () => {
    const unsupported = { ...VALID_PAYLOAD, data: { ...VALID_PAYLOAD.data, currency: "USD" } };
    expect(unsupported.data.currency).not.toBe("XAF");
  });
});
