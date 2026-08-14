import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("admin_apply_fleet_plan_internal compatibility", () => {
  it("does not order subscriptions by a missing abonnements.created_at column", () => {
    const sql = readFileSync(
      "supabase/migrations/20260804104500_fix_admin_apply_fleet_plan_ordering.sql",
      "utf8",
    );

    expect(sql).toContain("create or replace function public.admin_apply_fleet_plan_internal");
    expect(sql).toContain("order by a.starts_at desc nulls last, a.id desc");
    expect(sql).not.toContain("a.created_at");
    expect(sql).toContain("notify pgrst, 'reload schema'");
  });

  it("persists vehicle_slots when legacy admin/demo plan assignment creates a subscription", () => {
    const sql = readFileSync(
      "supabase/migrations/20260811123000_repair_admin_apply_fleet_plan_vehicle_slots.sql",
      "utf8",
    );

    expect(sql).toContain("create or replace function public.admin_apply_fleet_plan_internal");
    expect(sql).toContain("v_vehicle_slots");
    expect(sql).toContain("insert into public.abonnements (fleet_id, plan_id, payment_id, starts_at, ends_at, status, vehicle_slots)");
    expect(sql).toContain("least(v_vehicle_slots, coalesce(v_plan_max, v_vehicle_slots))");
    expect(sql).toContain("notify pgrst, 'reload schema'");
  });
});
