import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = () =>
  readFileSync(
    "supabase/migrations/20260811131500_create_vehicle_with_subscription_rpc.sql",
    "utf8",
  );

describe("create_vehicle_with_subscription RPC", () => {
  it("creates vehicles through an explicit subscription assignment path", () => {
    const sql = migration();

    expect(sql).toContain("create or replace function public.create_vehicle_with_subscription");
    expect(sql).toContain("public.rbac_check_permission('vehicle.create', p_fleet_id)");
    expect(sql).toContain("p_subscription_id");
    expect(sql).toContain("public.assign_vehicle_to_subscription(v_vehicle.id, p_subscription_id, auth.uid())");
    expect(sql).toContain("grant execute on function public.create_vehicle_with_subscription");
    expect(sql).toContain("notify pgrst, 'reload schema'");
  });

  it("activates an inactive subscription when the first vehicle is created", () => {
    const sql = migration();

    expect(sql).toContain("if v_target.status = 'inactive' then");
    expect(sql).toContain("update public.abonnements");
    expect(sql).toContain("set status = 'active'");
    expect(sql).toContain("where id = p_subscription_id");
    expect(sql).toContain("v_target.status := 'active'");
  });
});
