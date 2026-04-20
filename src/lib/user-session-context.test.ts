import { describe, expect, it } from "vitest";
import { computeAuthFlowDecision } from "@/lib/auth-flow";
import {
  authFlowComputeInputFromUserSessionContext,
  type UserSessionContextRpc,
} from "@/lib/user-session-context";
import { ROUTE_PATHS } from "@/navigation/routePaths";

function ctx(partial: Partial<UserSessionContextRpc>): UserSessionContextRpc {
  return {
    has_memberships: false,
    user_created_at: null,
    last_sign_in_at: null,
    onboarding_completed: true,
    lapsed_paid: false,
    role: null,
    active_fleet_id: null,
    org_id: null,
    ...partial,
  };
}

describe("authFlowComputeInputFromUserSessionContext + computeAuthFlowDecision", () => {
  it("sans adhésion → /start (tenant_bootstrap)", () => {
    const input = authFlowComputeInputFromUserSessionContext(
      ctx({ has_memberships: false }),
      ROUTE_PATHS.dashboard,
    );
    expect(computeAuthFlowDecision(input)).toEqual({
      path: ROUTE_PATHS.tenantBootstrap,
      reason: "tenant_bootstrap",
    });
  });

  it("organizer + onboarding incomplet → /onboarding", () => {
    const input = authFlowComputeInputFromUserSessionContext(
      ctx({
        has_memberships: true,
        role: "organizer",
        onboarding_completed: false,
        org_id: "00000000-0000-0000-0000-000000000001",
        active_fleet_id: "00000000-0000-0000-0000-000000000002",
      }),
      ROUTE_PATHS.dashboard,
    );
    expect(computeAuthFlowDecision(input)).toEqual({
      path: ROUTE_PATHS.onboarding,
      reason: "onboarding",
    });
  });

  it("lapsed_paid → /upgrade", () => {
    const input = authFlowComputeInputFromUserSessionContext(
      ctx({
        has_memberships: true,
        role: "manager",
        onboarding_completed: true,
        lapsed_paid: true,
        org_id: "00000000-0000-0000-0000-000000000001",
        active_fleet_id: "00000000-0000-0000-0000-000000000002",
      }),
      ROUTE_PATHS.dashboard,
    );
    expect(computeAuthFlowDecision(input)).toEqual({
      path: ROUTE_PATHS.upgrade,
      reason: "lapsed_paid",
    });
  });

  it("conducteur → /terrain", () => {
    const input = authFlowComputeInputFromUserSessionContext(
      ctx({
        has_memberships: true,
        role: "driver",
        onboarding_completed: true,
        org_id: "00000000-0000-0000-0000-000000000001",
        active_fleet_id: "00000000-0000-0000-0000-000000000002",
      }),
      ROUTE_PATHS.dashboard,
    );
    expect(computeAuthFlowDecision(input)).toEqual({
      path: ROUTE_PATHS.terrain,
      reason: "role_driver",
    });
  });

  it("mécano → /maintenance", () => {
    const input = authFlowComputeInputFromUserSessionContext(
      ctx({
        has_memberships: true,
        role: "mechanic",
        onboarding_completed: true,
        org_id: "00000000-0000-0000-0000-000000000001",
        active_fleet_id: "00000000-0000-0000-0000-000000000002",
      }),
      ROUTE_PATHS.dashboard,
    );
    expect(computeAuthFlowDecision(input)).toEqual({
      path: ROUTE_PATHS.maintenanceRoot,
      reason: "role_mechanic",
    });
  });

  it("manager sans blocage → safeNextPath", () => {
    const input = authFlowComputeInputFromUserSessionContext(
      ctx({
        has_memberships: true,
        role: "manager",
        onboarding_completed: true,
        org_id: "00000000-0000-0000-0000-000000000001",
        active_fleet_id: "00000000-0000-0000-0000-000000000002",
      }),
      "/dashboard/vehicles",
    );
    expect(computeAuthFlowDecision(input)).toEqual({
      path: "/dashboard/vehicles",
      reason: "default_next",
    });
  });
});
