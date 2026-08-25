import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20260825115003_pending_subscription_access_and_exclusive_activation.sql",
  "utf8",
);

const functionBody = (name: string) => {
  const start = migration.indexOf(`CREATE OR REPLACE FUNCTION public.${name}`);
  const next = migration.indexOf("CREATE OR REPLACE FUNCTION public.", start + 1);
  return migration.slice(start, next === -1 ? undefined : next);
};

describe("pending subscription activation", () => {
  it("enforces one active subscription per fleet", () => {
    expect(migration).toContain("CREATE UNIQUE INDEX IF NOT EXISTS abonnements_one_active_per_fleet_idx");
    expect(migration).toContain("ON public.abonnements (fleet_id)");
    expect(migration).toContain("WHERE status = 'active'");
  });

  it("allows paid pending subscriptions to be activated and replaces the previous active plan", () => {
    const activate = functionBody("activate_fleet_subscription");

    expect(activate).toContain("v_sub.status NOT IN ('inactive', 'pending_payment')");
    expect(activate).toContain("p.status = 'succeeded'");
    expect(activate).toContain("id <> p_subscription_id");
    expect(activate).toContain("status = 'cancelled'");
    expect(activate).toContain("SET status = 'active'");
  });

  it("activates a pending subscription when it is selected during vehicle creation", () => {
    const createVehicle = functionBody("create_vehicle_with_subscription");

    expect(createVehicle).toContain("v_target.status IN ('inactive', 'pending_payment')");
    expect(createVehicle).toContain("PERFORM public.activate_fleet_subscription(p_subscription_id)");
    expect(createVehicle).toContain("public.assign_vehicle_to_subscription");
  });
});
