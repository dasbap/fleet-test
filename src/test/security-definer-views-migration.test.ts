import { existsSync, readFileSync } from "node:fs";

const migrationPath =
  "supabase/migrations/20260824133000_fix_security_definer_views_invoker.sql";

const advisorViews = [
  "v_kpis_flotte",
  "v_creneaux_actifs_validations",
  "vehicle_failure_features_v1",
  "v_access_matrix",
  "v_geofences_with_stats",
];

describe("security definer views advisor migration", () => {
  it("sets all advisor-reported public views to security_invoker", () => {
    expect(existsSync(migrationPath)).toBe(true);

    const sql = readFileSync(migrationPath, "utf8").toLowerCase();

    for (const view of advisorViews) {
      expect(sql).toContain(
        `alter view if exists public.${view} set (security_invoker = true);`,
      );
    }

    expect(sql).toContain("notify pgrst, 'reload schema'");
  });
});