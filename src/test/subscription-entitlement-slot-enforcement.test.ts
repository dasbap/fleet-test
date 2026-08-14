import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = () =>
  readFileSync(
    "supabase/migrations/20260811133000_enforce_subscription_vehicle_entitlement_slots.sql",
    "utf8",
  );

describe("subscription vehicle entitlement slot enforcement", () => {
  it("enforces subscription vehicle_slots directly on droits_vehicules", () => {
    const sql = migration();

    expect(sql).toContain("create or replace function public.trg_enforce_subscription_vehicle_slot_limit()");
    expect(sql).toContain("before insert or update of subscription_id, vehicle_id, active on public.droits_vehicules");
    expect(sql).toContain("coalesce(v_sub.vehicle_slots, v_sub.max_vehicles_per_subscription)");
    expect(sql).toContain("where subscription_id = new.subscription_id");
    expect(sql).toContain("and id is distinct from new.id");
    expect(sql).toContain("raise exception 'limite_vehicules_abonnement_atteinte'");
    expect(sql).toContain("row_number() over (");
    expect(sql).toContain("partition by dv.subscription_id");
    expect(sql).toContain("not public.is_vehicle_subscription_status_active(a.status)");
    expect(sql).toContain("set active = false");
    expect(sql).toContain("notify pgrst, 'reload schema'");
  });
});
