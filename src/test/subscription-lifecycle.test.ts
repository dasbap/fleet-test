import { describe, it, expect } from "vitest";
import {
  SUBSCRIPTION_ACCESS,
  getAccessRule,
} from "@/server/domain/billing/subscriptionLifecycle";
import type { SubscriptionStatus } from "@/types/billing-production";

// ─── Règles d'accès par statut ─────────────────────────────

describe("SUBSCRIPTION_ACCESS — trial", () => {
  const rule = SUBSCRIPTION_ACCESS.trial;

  it("limite à 3 véhicules", () => expect(rule.maxVehicles).toBe(3));
  it("autorise l'ajout de véhicules", () => expect(rule.canAddVehicles).toBe(true));
  it("n'active pas les features premium", () => expect(rule.premiumFeatures).toBe(false));
  it("autorise l'accès terrain", () => expect(rule.terrainAccess).toBe(true));
  it("n'est pas en lecture seule", () => expect(rule.isReadOnly).toBe(false));
  it("ne requiert pas d'upgrade immédiat", () => expect(rule.needsUpgrade).toBe(false));
  it("a un message UX", () => expect(rule.message.length).toBeGreaterThan(0));
});

describe("SUBSCRIPTION_ACCESS — active", () => {
  const rule = SUBSCRIPTION_ACCESS.active;

  it("max véhicules illimité (Infinity)", () => expect(rule.maxVehicles).toBe(Infinity));
  it("autorise l'ajout de véhicules", () => expect(rule.canAddVehicles).toBe(true));
  it("active les features premium", () => expect(rule.premiumFeatures).toBe(true));
  it("autorise l'accès terrain", () => expect(rule.terrainAccess).toBe(true));
  it("n'est pas en lecture seule", () => expect(rule.isReadOnly).toBe(false));
  it("ne requiert pas d'upgrade", () => expect(rule.needsUpgrade).toBe(false));
});

describe("SUBSCRIPTION_ACCESS — grace_period", () => {
  const rule = SUBSCRIPTION_ACCESS.grace_period;

  it("bloque l'ajout de nouveaux véhicules", () => expect(rule.canAddVehicles).toBe(false));
  it("bloque les features premium", () => expect(rule.premiumFeatures).toBe(false));
  it("maintient l'accès terrain essentiel", () => expect(rule.terrainAccess).toBe(true));
  it("n'est pas en lecture seule", () => expect(rule.isReadOnly).toBe(false));
  it("requiert un upgrade", () => expect(rule.needsUpgrade).toBe(true));
  it("a sévérité warning", () => expect(rule.severity).toBe("warning"));
});

describe("SUBSCRIPTION_ACCESS — suspended", () => {
  const rule = SUBSCRIPTION_ACCESS.suspended;

  it("bloque tous les véhicules", () => expect(rule.maxVehicles).toBe(0));
  it("bloque l'accès terrain", () => expect(rule.terrainAccess).toBe(false));
  it("est en lecture seule", () => expect(rule.isReadOnly).toBe(true));
  it("requiert un upgrade", () => expect(rule.needsUpgrade).toBe(true));
  it("a sévérité error", () => expect(rule.severity).toBe("error"));
});

describe("SUBSCRIPTION_ACCESS — expired", () => {
  const rule = SUBSCRIPTION_ACCESS.expired;

  it("est en lecture seule", () => expect(rule.isReadOnly).toBe(true));
  it("requiert un upgrade", () => expect(rule.needsUpgrade).toBe(true));
  it("bloque l'accès terrain", () => expect(rule.terrainAccess).toBe(false));
});

describe("SUBSCRIPTION_ACCESS — cancelled", () => {
  const rule = SUBSCRIPTION_ACCESS.cancelled;

  it("est en lecture seule", () => expect(rule.isReadOnly).toBe(true));
  it("requiert un upgrade", () => expect(rule.needsUpgrade).toBe(true));
  it("a sévérité muted", () => expect(rule.severity).toBe("muted"));
});

describe("SUBSCRIPTION_ACCESS — pending_payment", () => {
  const rule = SUBSCRIPTION_ACCESS.pending_payment;

  it("n'est pas en lecture seule pendant le paiement", () => expect(rule.isReadOnly).toBe(false));
  it("maintient l'accès terrain", () => expect(rule.terrainAccess).toBe(true));
  it("ne requiert pas d'upgrade immédiat", () => expect(rule.needsUpgrade).toBe(false));
  it("bloque l'ajout de véhicules (attente confirmation)", () => expect(rule.canAddVehicles).toBe(false));
});

// ─── Invariants globaux ─────────────────────────────────────

describe("SUBSCRIPTION_ACCESS — couverture complète", () => {
  const TOUS_LES_STATUTS: SubscriptionStatus[] = [
    "trial", "pending_payment", "active", "grace_period",
    "suspended", "expired", "cancelled",
  ];

  TOUS_LES_STATUTS.forEach((status) => {
    it(`statut "${status}" a une règle définie`, () => {
      const rule = SUBSCRIPTION_ACCESS[status];
      expect(rule).toBeDefined();
      expect(rule.severity).toMatch(/^(info|warning|error|muted)$/);
    });
  });
});

// ─── getAccessRule ──────────────────────────────────────────

describe("getAccessRule", () => {
  it("retourne la règle active pour active", () => {
    expect(getAccessRule("active").premiumFeatures).toBe(true);
  });

  it("retourne la règle trial pour trial", () => {
    expect(getAccessRule("trial").maxVehicles).toBe(3);
  });

  it("retourne suspended pour un statut inconnu (fallback)", () => {
    // @ts-expect-error — test fallback statut invalide
    const rule = getAccessRule("ghost_status");
    expect(rule.isReadOnly).toBe(true);
  });
});

// ─── Transitions valides ────────────────────────────────────

describe("Transitions lifecycle — règles métier", () => {
  it("trial a accès terrain mais pas premium", () => {
    const r = SUBSCRIPTION_ACCESS.trial;
    expect(r.terrainAccess).toBe(true);
    expect(r.premiumFeatures).toBe(false);
  });

  it("grace_period conserve terrain mais coupe premium", () => {
    const r = SUBSCRIPTION_ACCESS.grace_period;
    expect(r.terrainAccess).toBe(true);
    expect(r.premiumFeatures).toBe(false);
  });

  it("suspended coupe terrain et passe en lecture seule", () => {
    const r = SUBSCRIPTION_ACCESS.suspended;
    expect(r.terrainAccess).toBe(false);
    expect(r.isReadOnly).toBe(true);
  });

  it("active → grace_period : terrain conservé, premium coupé", () => {
    const active = SUBSCRIPTION_ACCESS.active;
    const grace  = SUBSCRIPTION_ACCESS.grace_period;
    expect(active.terrainAccess).toBe(true);
    expect(grace.terrainAccess).toBe(true);
    expect(active.premiumFeatures).toBe(true);
    expect(grace.premiumFeatures).toBe(false);
  });
});
