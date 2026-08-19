import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const entitlementMigration = () =>
  readFileSync(
    "supabase/migrations/20260817120000_enforce_subscription_feature_entitlements.sql",
    "utf8",
  );

const scopeMigration = () =>
  readFileSync(
    "supabase/migrations/20260819103000_scope_feature_entitlements.sql",
    "utf8",
  );

describe("subscription feature entitlement enforcement", () => {
  it("enforces premium features at database boundaries", () => {
    const sql = entitlementMigration();

    expect(sql).toContain("create or replace function public.fleet_feature_enabled");
    expect(sql).toContain("create or replace function public.trg_require_fleet_feature()");
    expect(sql).toContain("feature_not_in_subscription:%");
    expect(sql).toContain("public.fleet_feature_enabled(p_fleet_id, 'ai')");
    expect(sql).toContain("trg_vehicle_costs_require_finance");
    expect(sql).toContain("trg_scheduled_reports_require_feature");
    expect(sql).toContain("trg_geofences_require_feature");
    expect(sql).toContain("trg_gps_devices_require_feature");
    expect(sql).toContain("as restrictive");
    expect(sql).toContain("notify pgrst, 'reload schema'");
  });

  it("ne divulgue pas les entitlements d'une flotte a un non-membre", () => {
    const sql = scopeMigration();

    expect(sql).toContain("fa.user_id = auth.uid()");
    expect(sql).toContain("fa.is_active = true");
    expect(sql).toMatch(/auth\.role\(\)\s*<>\s*'service_role'|auth\.role\(\)\s*=\s*'service_role'/);
    expect(sql).toContain("REVOKE EXECUTE ON FUNCTION public.fleet_feature_enabled(uuid, text) FROM PUBLIC, anon");
  });
});
