import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20260819122500_fix_reviewed_business_logic_gaps.sql",
  "utf8",
);

const functionBody = (name: string) => {
  const start = migration.indexOf(`CREATE OR REPLACE FUNCTION public.${name}`);
  const next = migration.indexOf("CREATE OR REPLACE FUNCTION public.", start + 1);
  return migration.slice(start, next === -1 ? undefined : next);
};

describe("reviewed business logic regressions", () => {
  it("binds demo subscription activation to the authenticated caller", () => {
    const activate = functionBody("activate_fleet_subscription");
    const createVehicle = functionBody("create_vehicle_with_subscription");

    expect(activate).toContain("dp.user_id = auth.uid()");
    expect(activate).toContain("fa.user_id = auth.uid()");
    expect(activate).toContain("dp.fleet_id = v_sub.fleet_id");

    expect(createVehicle).toContain("dp.user_id = auth.uid()");
    expect(createVehicle).toContain("fa.user_id = auth.uid()");
    expect(createVehicle).toContain("dp.fleet_id = p_fleet_id");
  });

  it("does not expose subscriptions before starts_at", () => {
    const activate = functionBody("activate_fleet_subscription");
    const createVehicle = functionBody("create_vehicle_with_subscription");
    const slots = functionBody("get_subscription_available_slots");
    const canCreate = functionBody("can_create_vehicle");
    const planAccess = functionBody("get_plan_access");

    expect(activate).toContain("v_sub.starts_at");
    expect(activate).toContain("abonnement_pas_encore_actif");
    expect(createVehicle).toContain("v_target.starts_at");
    expect(createVehicle).toContain("abonnement_pas_encore_actif");
    expect(slots).toContain("v_sub.starts_at");
    expect(canCreate).toContain("a.starts_at");
    expect(planAccess.match(/a\.starts_at/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it("keeps at least one active organizer in a fleet", () => {
    const membership = functionBody("creer_ou_mettre_a_jour_adhesion_flotte");

    expect(membership).toContain("FOR UPDATE");
    expect(membership).toContain("fa.user_id IS DISTINCT FROM p_user_id");
    expect(membership).toContain("dernier_organizer_requis");
    expect(membership).toContain("NOT p_is_active OR p_role IS DISTINCT FROM 'organizer'");
  });
});
