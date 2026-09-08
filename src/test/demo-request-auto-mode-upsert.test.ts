import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath = "supabase/migrations/20260908163000_fix_demo_request_auto_mode_upsert.sql";
const sql = readFileSync(migrationPath, "utf8");

describe("demo request auto mode upsert", () => {
  it("avoids a standalone update blocked by pg-safeupdate", () => {
    expect(sql).toContain("insert into public.demo_request_settings");
    expect(sql).toContain("on conflict (id) do update");
    expect(sql).not.toMatch(/\n\s*update public\.demo_request_settings\b/i);
  });

  it("keeps admin authorization and restricted RPC execution", () => {
    expect(sql).toContain("support_current_user_is_admin()");
    expect(sql).toContain("security definer");
    expect(sql).toContain("set search_path = public");
    expect(sql).toContain("revoke all on function public.admin_update_demo_request_auto_mode");
    expect(sql).toContain("to authenticated, service_role");
  });
});
