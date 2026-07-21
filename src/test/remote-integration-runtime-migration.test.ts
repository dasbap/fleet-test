import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260721143000_restore_remote_integration_runtime.sql",
);

describe("remote integration runtime migration", () => {
  it("restores the RPC and vehicle-limit trigger required by remote CI", () => {
    expect(existsSync(migrationPath)).toBe(true);

    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("create table if not exists public.failure_predictions");
    expect(sql).toContain("drop function if exists public.predict_failure_risk(uuid, uuid)");
    expect(sql).toContain("drop view if exists public.vehicle_failure_features_v1");
    expect(sql).toContain("create or replace view public.vehicle_failure_features_v1");
    expect(sql).toContain("v.status as vehicle_status");
    expect(sql).not.toContain("v.status::text as vehicle_status");
    expect(sql).toContain("create or replace function public.predict_failure_risk");
    expect(sql).toContain("grant execute on function public.predict_failure_risk(uuid, uuid) to authenticated");
    expect(sql).toContain("create or replace function public.trg_enforce_fleet_vehicle_limit");
    expect(sql).toContain("create trigger trg_enforce_fleet_vehicle_limit");
    expect(sql).toContain("limite_vehicules_plan_atteinte");
    expect(sql).toContain("notify pgrst, 'reload schema'");
  });
});
