import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath = "supabase/migrations/20260908160000_fix_demo_request_auto_mode_safeupdate.sql";

describe("demo request auto mode safeupdate", () => {
  const sql = readFileSync(migrationPath, "utf8");

  it("cible explicitement la ligne singleton pour rester compatible avec safeupdate", () => {
    expect(sql).toMatch(
      /update public\.demo_request_settings[\s\S]*?where id = true[\s\S]*?returning \* into v_row;/i,
    );
  });

  it("conserve le contrôle admin et les droits RPC restreints", () => {
    expect(sql).toContain("support_current_user_is_admin()");
    expect(sql).toContain("security definer");
    expect(sql).toContain("set search_path = public");
    expect(sql).toContain("revoke all on function public.admin_update_demo_request_auto_mode");
    expect(sql).toContain("to authenticated, service_role");
  });

  it("est rejouée par la chaîne baseline/delta", () => {
    const deltas = readFileSync("supabase/baseline/delta-migrations.txt", "utf8");
    expect(deltas).toContain(migrationPath);
  });
});
