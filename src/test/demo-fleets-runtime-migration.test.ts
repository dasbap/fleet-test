import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("demo fleets runtime migration", () => {
  it("keeps the old runtime repair superseded by the no-global-demo-fleet migration", () => {
    const oldSql = readFileSync(
      "supabase/migrations/20260721133000_restore_demo_fleets_is_demo_runtime.sql",
      "utf8"
    );
    const newSql = readFileSync(
      "supabase/migrations/20260722165000_stop_global_demo_fleet_assignment.sql",
      "utf8"
    );

    expect(oldSql).toContain("Flotte DEMO Pro");
    expect(newSql).not.toContain("delete from public.flottes");
    expect(newSql).toContain("update public.flottes");
    expect(newSql).toContain("set archived_at = now()");
    expect(newSql).toContain("demo_fleet_assignment_not_allowed_at_creation");
    expect(newSql).toContain("notify pgrst, 'reload schema'");
  });
});
