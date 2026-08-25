import { existsSync, readFileSync } from "node:fs";

const migrationPath =
  "supabase/migrations/20260825133500_require_active_vehicle_subscription_for_assignment.sql";

describe("vehicle assignment subscription guard", () => {
  it("requires an active vehicle right backed by an active subscription", () => {
    expect(existsSync(migrationPath)).toBe(true);

    const sql = readFileSync(migrationPath, "utf8").toLowerCase();

    expect(sql).toContain("from public.droits_vehicules dv");
    expect(sql).toContain("join public.abonnements a on a.id = dv.subscription_id");
    expect(sql).toContain("dv.vehicle_id = p_vehicle_id");
    expect(sql).toContain("dv.active is true");
    expect(sql).toContain("dv.status = 'active'");
    expect(sql).toContain("a.fleet_id = p_fleet_id");
    expect(sql).toContain("a.status = 'active'");
    expect(sql).toContain("raise exception 'vehicule_sans_abonnement_actif'");
  });
});
