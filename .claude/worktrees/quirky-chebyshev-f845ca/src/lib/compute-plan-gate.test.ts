import { describe, it, expect } from "vitest";
import {
  computePlanGate,
  DEFAULT_FLEET_BILLING_CONTEXT,
} from "@/lib/compute-plan-gate";
import type { FleetBillingContext } from "@/types/fleet-billing";
import type { BillingSnapshot } from "@/services/billing.service";

describe("computePlanGate", () => {
  it("plan gratuit actif sans abonnement", () => {
    const r = computePlanGate(null, null);
    expect(r.planCode).toBe("free");
    expect(r.plan_expired).toBe(false);
    expect(r.plan_active).toBe(true);
  });

  it("abonnement payant actif (snapshot présent)", () => {
    const fb: FleetBillingContext = {
      ...DEFAULT_FLEET_BILLING_CONTEXT,
      planCode: "pro",
      isPaid: true,
    };
    const billing: BillingSnapshot = {
      lapsedPaid: false,
      subscription: {
        id: "s1",
        status: "active",
        startsAt: "",
        endsAt: "",
        plan: null,
      },
      recentPayments: [],
    };
    const r = computePlanGate(fb, billing);
    expect(r.plan_expired).toBe(false);
    expect(r.plan_active).toBe(true);
  });

  it("lapsedPaid → plan expiré et accès bloqué", () => {
    const fb: FleetBillingContext = {
      ...DEFAULT_FLEET_BILLING_CONTEXT,
      planCode: "pro",
      isPaid: true,
    };
    const billing: BillingSnapshot = {
      lapsedPaid: true,
      subscription: null,
      recentPayments: [],
    };
    const r = computePlanGate(fb, billing);
    expect(r.plan_expired).toBe(true);
    expect(r.plan_active).toBe(false);
  });

  it("plan pro sans isPaid ni subscription : inactif", () => {
    const fb: FleetBillingContext = {
      ...DEFAULT_FLEET_BILLING_CONTEXT,
      planCode: "pro",
      isPaid: false,
    };
    const r = computePlanGate(fb, {
      lapsedPaid: false,
      subscription: null,
      recentPayments: [],
    });
    expect(r.plan_active).toBe(false);
    expect(r.plan_expired).toBe(false);
  });
});
