import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260722153000_super_admin_singleton.sql",
);

describe("super admin runtime migration", () => {
  it("adds a single active super admin and exposes an RPC guard", () => {
    expect(existsSync(migrationPath)).toBe(true);

    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("internal_role in ('super_admin', 'admin', 'dev', 'commercial')");
    expect(sql).toContain("ux_admin_profiles_single_active_super_admin");
    expect(sql).toContain("where is_active = true and internal_role = 'super_admin'");
    expect(sql).toContain("create or replace function public.is_platform_super_admin()");
    expect(sql).toContain("grant execute on function public.is_platform_super_admin() to authenticated");
    expect(sql).toContain("notify pgrst, 'reload schema'");
  });

  it("keeps platform admin boolean guards callable before a user session is ready", () => {
    const sql = readFileSync(
      resolve(
        process.cwd(),
        "supabase/migrations/20260811130000_allow_anon_platform_admin_boolean_guards.sql",
      ),
      "utf8",
    );

    expect(sql).toContain("grant execute on function public.is_platform_admin() to anon, authenticated");
    expect(sql).toContain("grant execute on function public.is_platform_super_admin() to anon, authenticated");
    expect(sql).toContain("notify pgrst, 'reload schema'");
  });
});
