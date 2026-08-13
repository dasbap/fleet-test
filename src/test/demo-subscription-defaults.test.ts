import { existsSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const migrationPath =
  "supabase/migrations/20260812110000_demo_subscriptions_start_inactive.sql";

describe("demo subscription defaults", () => {
  it("creates a one-month inactive demo subscription with ten vehicle slots", () => {
    expect(existsSync(migrationPath)).toBe(true);

    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("create or replace function public.prospect_create_account");
    expect(sql).toContain("now() + interval '1 month'");
    expect(sql).toContain("vehicle_slots");
    expect(sql).toContain("10");
    expect(sql).toContain("'inactive'");
    expect(sql).toContain("'starter'");
  });

  it("exposes manual activation for fleet organizers and reloads PostgREST", () => {
    expect(existsSync(migrationPath)).toBe(true);

    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("create or replace function public.activate_fleet_subscription");
    expect(sql).toContain("public.rbac_check_permission('billing.manage'");
    expect(sql).toContain("set status = 'active'");
    expect(sql).toContain("grant execute on function public.activate_fleet_subscription(uuid) to authenticated");
    expect(sql).toContain("notify pgrst, 'reload schema'");
  });

  it("is part of the replayed delta migration list", () => {
    const deltaMigrations = readFileSync("supabase/baseline/delta-migrations.txt", "utf8");

    expect(deltaMigrations).toContain(migrationPath.replaceAll("\\", "/"));
  });
});
