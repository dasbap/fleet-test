import { existsSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const migrationPath =
  "supabase/migrations/20260722165000_stop_global_demo_fleet_assignment.sql";

describe("global demo fleet removal policy", () => {
  it("keeps new demo accounts unattached until a demo organizer creates a fleet", () => {
    expect(existsSync(migrationPath)).toBe(true);
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("demo_fleet_assignment_not_allowed_at_creation");
    expect(sql).toContain("set fleet_id = null");
    expect(sql).toContain("delete from public.flotte_adhesions");
    expect(sql).not.toContain("delete from public.flottes");
    expect(sql).toContain("update public.flottes");
    expect(sql).toContain("set archived_at = now()");
    expect(sql).toContain("'Flotte DEMO Starter'");
    expect(sql).toContain("'Flotte DEMO Pro'");
    expect(sql).toContain("'Flotte DEMO Entreprise'");
    expect(sql).not.toContain("where is_demo = true\n     order by id");
  });
});
