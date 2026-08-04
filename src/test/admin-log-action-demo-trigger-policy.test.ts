import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("admin_log_action demo-trigger policy", () => {
  it("allows demo-triggered default plan audit when the stored actor is an active admin", () => {
    const sql = readFileSync(
      "supabase/migrations/20260804111500_allow_demo_default_plan_admin_audit.sql",
      "utf8",
    );

    expect(sql).toContain("create or replace function public.admin_log_action");
    expect(sql).toContain("p_admin_user_id");
    expect(sql).toContain("from public.admin_profiles ap");
    expect(sql).toContain("ap.user_id = p_admin_user_id");
    expect(sql).toContain("raise exception 'forbidden'");
    expect(sql).toContain("notify pgrst, 'reload schema'");
  });
});
