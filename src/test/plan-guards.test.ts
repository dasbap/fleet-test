import { describe, it, expect } from "vitest";
import {
  canCreateVehicle,
  canUsePulse,
  canUseQrPremium,
  canExportReports,
  canUseFinance,
  canAccessMultiFleet,
  canUseDriverScoring,
  getAllPlanAccess,
} from "@/lib/billing/planGuards";
import type { FleetBillingContext } from "@/types/billing-production";

// ─── Factories ────────────────────────────────────────────────────────────

function makeCtx(overrides: Partial<FleetBillingContext> = {}): FleetBillingContext {
  return {
    planCode:              "free",
    isPaid:                false,
    vehicleCount:          1,
    activeVehicles:        1,
    vehicleSlots:          3,
    maxVehicles:           3,
    billingStatus:         "trial",
    trialEndsAt:           null,
    subscriptionEndsAt:    null,
    gracePeriodEndsAt:     null,
    financeEnabled:        false,
    aiEnabled:             false,
    reportsEnabled:        false,
    driverScoringEnabled:  false,
    anomalyInsightsEnabled: false,
    geofencingEnabled:     false,
    scheduledReportsEnabled: false,
    offlineDriverEnabled:  false,
    ...overrides,
  };
}

const FREE_CTX    = makeCtx();
const STARTER_CTX = makeCtx({ planCode: "starter", isPaid: true, billingStatus: "active", maxVehicles: 25, financeEnabled: true, reportsEnabled: true, driverScoringEnabled: true });
const PRO_CTX     = makeCtx({ planCode: "pro",     isPaid: true, billingStatus: "active", maxVehicles: 100, financeEnabled: true, reportsEnabled: true, driverScoringEnabled: true, aiEnabled: true, anomalyInsightsEnabled: true });
const ENTERPRISE  = makeCtx({ planCode: "enterprise", isPaid: true, billingStatus: "enterprise" as ReturnType<typeof makeCtx>["billingStatus"], maxVehicles: Infinity, financeEnabled: true, reportsEnabled: true, driverScoringEnabled: true, aiEnabled: true });
const ORGANIZER   = makeCtx({ planCode: "organizer", isPaid: true, billingStatus: "active", maxVehicles: Infinity, financeEnabled: true, reportsEnabled: true, driverScoringEnabled: true, aiEnabled: true, anomalyInsightsEnabled: true });
const SUSPENDED   = makeCtx({ billingStatus: "suspended" });
const GRACE       = makeCtx({ planCode: "starter", billingStatus: "grace_period", isPaid: true, maxVehicles: 25 });

// ─── canCreateVehicle ──────────────────────────────────────────────────────

describe("canCreateVehicle", () => {
  it("permet ajout sur free trial sous la limite", () => {
    const result = canCreateVehicle(makeCtx({ vehicleCount: 2, maxVehicles: 3 }));
    expect(result.allowed).toBe(true);
  });

  it("bloque quand la limite max est atteinte", () => {
    const result = canCreateVehicle(makeCtx({ vehicleCount: 3, maxVehicles: 3 }));
    expect(result.allowed).toBe(false);
    expect(result.upgradeMessage).toBeTruthy();
    expect(result.requiredPlan).toBeDefined();
  });

  it("bloque si abonnement suspendu", () => {
    const result = canCreateVehicle(SUSPENDED);
    expect(result.allowed).toBe(false);
  });

  it("permet sur Pro avec beaucoup de véhicules", () => {
    const result = canCreateVehicle(makeCtx({ ...PRO_CTX, vehicleCount: 10, maxVehicles: 100 }));
    expect(result.allowed).toBe(true);
  });

  it("bloque sur Pro à la limite de 75", () => {
    const result = canCreateVehicle(makeCtx({ ...PRO_CTX, vehicleCount: 100, maxVehicles: 100 }));
    expect(result.allowed).toBe(false);
  });

  it("permet illimité sur Enterprise (maxVehicles = Infinity)", () => {
    const result = canCreateVehicle(makeCtx({ ...ENTERPRISE, vehicleCount: 500, maxVehicles: Infinity }));
    expect(result.allowed).toBe(true);
  });

  it("permet en grace_period si sous la limite", () => {
    const result = canCreateVehicle(makeCtx({ ...GRACE, vehicleCount: 3, maxVehicles: 25 }));
    expect(result.allowed).toBe(true);
  });
});

// ─── canUsePulse ──────────────────────────────────────────────────────────

describe("canUsePulse", () => {
  it("bloque sur Free (aiEnabled: false)", () => {
    expect(canUsePulse(FREE_CTX).allowed).toBe(false);
  });

  it("bloque sur Starter (aiEnabled: false)", () => {
    expect(canUsePulse(STARTER_CTX).allowed).toBe(false);
  });

  it("permet sur Pro (aiEnabled: true)", () => {
    expect(canUsePulse(PRO_CTX).allowed).toBe(true);
  });

  it("bloque si suspendu même avec aiEnabled", () => {
    const ctx = makeCtx({ aiEnabled: true, billingStatus: "suspended" });
    expect(canUsePulse(ctx).allowed).toBe(false);
  });

  it("retourne un message upgrade si bloqué", () => {
    const result = canUsePulse(FREE_CTX);
    expect(result.upgradeMessage).toBeTruthy();
    expect(result.requiredPlan).toBe("pro");
  });
});

// ─── canUseQrPremium ──────────────────────────────────────────────────────

describe("canUseQrPremium", () => {
  it("bloque sur Free", () => {
    expect(canUseQrPremium(FREE_CTX).allowed).toBe(false);
  });

  it("bloque sur Starter", () => {
    expect(canUseQrPremium(STARTER_CTX).allowed).toBe(false);
  });

  it("permet sur Pro", () => {
    expect(canUseQrPremium(PRO_CTX).allowed).toBe(true);
  });

  it("permet sur Enterprise", () => {
    expect(canUseQrPremium(ENTERPRISE).allowed).toBe(true);
  });

  it("permet sur Organizer", () => {
    expect(canUseQrPremium(ORGANIZER).allowed).toBe(true);
  });

  it("requiert plan pro minimum", () => {
    const result = canUseQrPremium(STARTER_CTX);
    expect(result.requiredPlan).toBe("pro");
  });
});

// ─── canExportReports ─────────────────────────────────────────────────────

describe("canExportReports", () => {
  it("bloque sur Free", () => {
    expect(canExportReports(FREE_CTX).allowed).toBe(false);
  });

  it("permet sur Starter (reportsEnabled: true)", () => {
    expect(canExportReports(STARTER_CTX).allowed).toBe(true);
  });

  it("permet sur Pro", () => {
    expect(canExportReports(PRO_CTX).allowed).toBe(true);
  });

  it("requiert plan starter minimum", () => {
    const result = canExportReports(FREE_CTX);
    expect(result.requiredPlan).toBe("starter");
  });
});

// ─── canUseFinance ────────────────────────────────────────────────────────

describe("canUseFinance", () => {
  it("bloque sur Free (financeEnabled: false)", () => {
    expect(canUseFinance(FREE_CTX).allowed).toBe(false);
  });

  it("permet sur Starter", () => {
    expect(canUseFinance(STARTER_CTX).allowed).toBe(true);
  });

  it("bloque si suspendu même avec financeEnabled", () => {
    const ctx = makeCtx({ financeEnabled: true, billingStatus: "suspended" });
    expect(canUseFinance(ctx).allowed).toBe(false);
  });
});

// ─── canAccessMultiFleet ──────────────────────────────────────────────────

describe("canAccessMultiFleet", () => {
  it("bloque sur Free", () => {
    expect(canAccessMultiFleet(FREE_CTX).allowed).toBe(false);
  });

  it("bloque sur Starter", () => {
    expect(canAccessMultiFleet(STARTER_CTX).allowed).toBe(false);
  });

  it("bloque sur Pro", () => {
    expect(canAccessMultiFleet(PRO_CTX).allowed).toBe(false);
  });

  it("permet sur Enterprise", () => {
    expect(canAccessMultiFleet(ENTERPRISE).allowed).toBe(true);
  });

  it("permet sur Organizer", () => {
    expect(canAccessMultiFleet(ORGANIZER).allowed).toBe(true);
  });

  it("requiert plan organizer", () => {
    const result = canAccessMultiFleet(PRO_CTX);
    expect(result.requiredPlan).toBe("organizer");
  });
});

// ─── canUseDriverScoring ──────────────────────────────────────────────────

describe("canUseDriverScoring", () => {
  it("bloque sur Free", () => {
    expect(canUseDriverScoring(FREE_CTX).allowed).toBe(false);
  });

  it("permet sur Starter", () => {
    expect(canUseDriverScoring(STARTER_CTX).allowed).toBe(true);
  });
});

// ─── getAllPlanAccess — cohérence ─────────────────────────────────────────

describe("getAllPlanAccess — Free", () => {
  const access = getAllPlanAccess(FREE_CTX);

  it("peut créer un véhicule (sous la limite)", () => {
    expect(access.createVehicle.allowed).toBe(true);
  });

  it("pas de Pulse", ()   => expect(access.pulse.allowed).toBe(false));
  it("pas de QR Premium", () => expect(access.qrPremium.allowed).toBe(false));
  it("pas d'exports",     () => expect(access.exportReports.allowed).toBe(false));
  it("pas de finance",    () => expect(access.finance.allowed).toBe(false));
  it("pas de multi-flotte", () => expect(access.multiFleet.allowed).toBe(false));
});

describe("getAllPlanAccess — Pro", () => {
  const access = getAllPlanAccess(PRO_CTX);

  it("Pulse autorisé",        () => expect(access.pulse.allowed).toBe(true));
  it("QR Premium autorisé",   () => expect(access.qrPremium.allowed).toBe(true));
  it("Exports autorisés",     () => expect(access.exportReports.allowed).toBe(true));
  it("Finance autorisée",     () => expect(access.finance.allowed).toBe(true));
  it("multi-flotte bloqué",   () => expect(access.multiFleet.allowed).toBe(false));
});

describe("getAllPlanAccess — Enterprise", () => {
  const access = getAllPlanAccess(ENTERPRISE);

  it("tout autorisé sauf si flag DB absent", () => {
    expect(access.multiFleet.allowed).toBe(true);
    expect(access.pulse.allowed).toBe(true);
  });
});

// ─── Invariants : tous les résultats ont une structure valide ─────────────

describe("getAllPlanAccess - Organizer", () => {
  const access = getAllPlanAccess(ORGANIZER);

  it("herite des fonctionnalites haut niveau de la flotte", () => {
    expect(access.multiFleet.allowed).toBe(true);
    expect(access.qrPremium.allowed).toBe(true);
    expect(access.pulse.allowed).toBe(true);
  });
});

describe("Invariants structure PlanAccessResult", () => {
  const ctxList = [FREE_CTX, STARTER_CTX, PRO_CTX, ENTERPRISE, ORGANIZER, SUSPENDED, GRACE];
  const guards = [canCreateVehicle, canUsePulse, canUseQrPremium, canExportReports, canUseFinance, canAccessMultiFleet];

  ctxList.forEach((ctx) => {
    guards.forEach((guard) => {
      it(`${guard.name}(${ctx.planCode}/${ctx.billingStatus}) retourne { allowed: boolean }`, () => {
        const result = guard(ctx);
        expect(typeof result.allowed).toBe("boolean");
        if (!result.allowed) {
          expect(typeof result.upgradeMessage).toBe("string");
        }
      });
    });
  });
});
