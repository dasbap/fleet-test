import { existsSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const migrationPath =
  "supabase/migrations/20260722171000_demo_admin_lifecycle_actions.sql";

describe("demo admin lifecycle RPC migration", () => {
  it("adds bounded expiration update and deletion RPCs", () => {
    expect(existsSync(migrationPath)).toBe(true);
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("create or replace function public.update_demo_account_expiration");
    expect(sql).toContain("created_at + interval '1 month'");
    expect(sql).toContain("max_demo_extension_exceeded");
    expect(sql).toContain("public.is_platform_super_admin()");
    expect(sql).toContain("create or replace function public.delete_demo_account");
    expect(sql.indexOf("delete from public.demo_audit_logs")).toBeGreaterThan(-1);
    expect(sql.indexOf("delete from public.demo_audit_logs")).toBeLessThan(
      sql.indexOf("delete from auth.users"),
    );
    expect(sql).toContain("delete from auth.users");
    expect(sql).toContain("grant execute on function public.update_demo_account_expiration(uuid, uuid, timestamptz) to authenticated");
    expect(sql).toContain("grant execute on function public.delete_demo_account(uuid, uuid, text) to authenticated");
    expect(sql).toContain("notify pgrst, 'reload schema'");
  });
});
