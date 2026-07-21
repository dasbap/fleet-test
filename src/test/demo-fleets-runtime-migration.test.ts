import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("demo fleets runtime migration", () => {
  it("restores flottes.is_demo required by the admin demo panel", () => {
    const sql = readFileSync(
      "supabase/migrations/20260721133000_restore_demo_fleets_is_demo_runtime.sql",
      "utf8"
    );

    expect(sql).toContain("add column if not exists is_demo boolean");
    expect(sql).toContain("idx_flottes_is_demo");
    expect(sql).toContain("idx_organisations_is_demo");
    expect(sql).toContain("Organisation DEMO E-Samba");
    expect(sql).toContain("Flotte DEMO Starter");
    expect(sql).toContain("Flotte DEMO Pro");
    expect(sql).toContain("Flotte DEMO Entreprise");
    expect(sql).toContain("flottes_select_platform_admin");
    expect(sql).toContain("public.is_platform_admin()");
    expect(sql).toContain("from public.demo_profiles dp");
    expect(sql).toContain("notify pgrst, 'reload schema'");
  });
});
