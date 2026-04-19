import { describe, expect, it } from "vitest";
import {
  AUTH_FLOW_FIRST_LOGIN_WINDOW_MS,
  computeAuthFlowDecision,
  deriveAuthFlowStatus,
  detectFirstLogin,
  toAuthFlowDecisionSnapshot,
} from "@/lib/auth-flow";
import { ROUTE_PATHS } from "@/navigation/routePaths";

const base = {
  hasUser: true,
  hasMemberships: true,
  onboardingCompleted: true,
  lapsedPaid: false,
  role: null as "organizer" | "driver" | "mechanic" | "manager" | null,
  safeNextPath: ROUTE_PATHS.dashboard,
};

describe("detectFirstLogin", () => {
  it("retourne false sans created_at", () => {
    expect(detectFirstLogin(undefined, "2026-01-01T00:00:00.000Z")).toBe(false);
  });

  it("retourne true sans last_sign_in", () => {
    expect(detectFirstLogin("2026-01-01T00:00:00.000Z", null)).toBe(true);
  });

  it("retourne true si première connexion dans la fenêtre", () => {
    const created = "2026-04-18T12:00:00.000Z";
    const last = new Date(new Date(created).getTime() + 30_000).toISOString();
    expect(detectFirstLogin(created, last, AUTH_FLOW_FIRST_LOGIN_WINDOW_MS)).toBe(true);
  });

  it("retourne false si connexion ultérieure hors fenêtre", () => {
    const created = "2026-01-01T00:00:00.000Z";
    const last = "2026-04-18T12:00:00.000Z";
    expect(detectFirstLogin(created, last)).toBe(false);
  });
});

describe("computeAuthFlowDecision", () => {
  it("sans utilisateur → /auth", () => {
    expect(
      computeAuthFlowDecision({
        ...base,
        hasUser: false,
      }),
    ).toEqual({ path: ROUTE_PATHS.auth, reason: "auth_required" });
  });

  it("sans adhésion → /start", () => {
    expect(
      computeAuthFlowDecision({
        ...base,
        hasMemberships: false,
      }),
    ).toEqual({ path: ROUTE_PATHS.tenantBootstrap, reason: "tenant_bootstrap" });
  });

  it("onboarding incomplet → /onboarding (organisateur uniquement)", () => {
    expect(
      computeAuthFlowDecision({
        ...base,
        role: "organizer",
        onboardingCompleted: false,
        userCreatedAt: "2025-01-01T00:00:00.000Z",
        lastSignInAt: "2026-04-18T12:00:00.000Z",
      }),
    ).toEqual({ path: ROUTE_PATHS.onboarding, reason: "onboarding" });
  });

  it("conducteur avec onboarding incomplet → /terrain (pas le wizard)", () => {
    expect(
      computeAuthFlowDecision({
        ...base,
        role: "driver",
        onboardingCompleted: false,
        userCreatedAt: "2025-01-01T00:00:00.000Z",
        lastSignInAt: "2026-04-18T12:00:00.000Z",
      }),
    ).toEqual({ path: ROUTE_PATHS.terrain, reason: "role_driver" });
  });

  it("première connexion → /onboarding", () => {
    const created = "2026-04-18T12:00:00.000Z";
    const last = new Date(new Date(created).getTime() + 10_000).toISOString();
    expect(
      computeAuthFlowDecision({
        ...base,
        role: "organizer",
        onboardingCompleted: true,
        userCreatedAt: created,
        lastSignInAt: last,
      }),
    ).toEqual({ path: ROUTE_PATHS.onboarding, reason: "onboarding" });
  });

  it("plan payant expiré → /upgrade (après onboarding)", () => {
    expect(
      computeAuthFlowDecision({
        ...base,
        userCreatedAt: "2025-01-01T00:00:00.000Z",
        lastSignInAt: "2026-04-18T12:00:00.000Z",
        lapsedPaid: true,
      }),
    ).toEqual({ path: ROUTE_PATHS.upgrade, reason: "lapsed_paid" });
  });

  it("conducteur avec abonnement actif → /terrain", () => {
    expect(
      computeAuthFlowDecision({
        ...base,
        role: "driver",
      }),
    ).toEqual({ path: ROUTE_PATHS.terrain, reason: "role_driver" });
  });

  it("mécanicien → /maintenance", () => {
    expect(
      computeAuthFlowDecision({
        ...base,
        role: "mechanic",
      }),
    ).toEqual({ path: ROUTE_PATHS.maintenanceRoot, reason: "role_mechanic" });
  });

  it("organisateur → next sûr", () => {
    expect(
      computeAuthFlowDecision({
        ...base,
        role: "organizer",
        safeNextPath: "/dashboard/reports",
      }),
    ).toEqual({ path: "/dashboard/reports", reason: "default_next" });
  });

  it("remplace next si boucle /post-login", () => {
    expect(
      computeAuthFlowDecision({
        ...base,
        role: "organizer",
        safeNextPath: `${ROUTE_PATHS.postLogin}?next=/dashboard`,
      }),
    ).toEqual({ path: ROUTE_PATHS.dashboard, reason: "default_next" });
  });
});

describe("deriveAuthFlowStatus", () => {
  it("chargement session → loading", () => {
    expect(
      deriveAuthFlowStatus(true, false, false, true, null),
    ).toBe("loading");
  });

  it("prêt sans user → unauthenticated", () => {
    expect(
      deriveAuthFlowStatus(false, false, true, false, {
        path: ROUTE_PATHS.auth,
        reason: "auth_required",
      }),
    ).toBe("unauthenticated");
  });

  it("bootstrap tenant", () => {
    expect(
      deriveAuthFlowStatus(false, false, true, true, {
        path: ROUTE_PATHS.tenantBootstrap,
        reason: "tenant_bootstrap",
      }),
    ).toBe("tenant_bootstrap");
  });
});

describe("toAuthFlowDecisionSnapshot", () => {
  it("préserve path et reason", () => {
    const d = computeAuthFlowDecision({
      ...base,
      role: "driver",
    });
    expect(toAuthFlowDecisionSnapshot(d)).toEqual(d);
  });
});
