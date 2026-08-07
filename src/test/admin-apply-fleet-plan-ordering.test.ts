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
});
