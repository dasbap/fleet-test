import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = () =>
  readFileSync(
    "supabase/migrations/20260811134500_enforce_subscription_total_vehicle_slots.sql",
    "utf8",
  );

describe("subscription total vehicle slot enforcement", () => {
  it("enforces the fleet plan max when subscriptions are bought or renewed", () => {
    const sql = migration();

    expect(sql).toContain("create or replace function public.trg_enforce_fleet_subscription_total_vehicle_slots()");
    expect(sql).toContain("before insert or update of fleet_id, plan_id, status, vehicle_slots");
    expect(sql).toContain("public.is_vehicle_subscription_status_active(new.status)");
    expect(sql).toContain("pg_advisory_xact_lock");
    expect(sql).toContain("coalesce(new.vehicle_slots, v_plan.max_vehicles_per_subscription, v_plan.max_vehicles, 1)");
    expect(sql).toContain("v_total_slots > v_plan.max_vehicles");
    expect(sql).toContain("raise exception 'limite_vehicules_plan_flotte_atteinte'");
    expect(sql).toContain("least(a.vehicle_slots, p.max_vehicles)");
    expect(sql).toContain("notify pgrst, 'reload schema'");
  });
});
