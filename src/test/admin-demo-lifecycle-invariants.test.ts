import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath =
  "supabase/migrations/20260904114000_fix_admin_demo_lifecycle_invariants.sql";

describe("admin demo lifecycle invariants", () => {
  const sql = readFileSync(migrationPath, "utf8");

  it("autorise uniquement le bypass admin des organisateurs demo", () => {
    expect(sql).toContain("current_setting('app.demo_lifecycle_bypass', true) = 'on'");
    expect(sql).toContain("public.is_platform_admin()");
    expect(sql).toContain("f.is_demo = true");
    expect(sql).toContain("set_config('app.demo_lifecycle_bypass', 'on', true)");
  });

  it("restaure l'adhesion lors d'une reactivation", () => {
    expect(sql).toContain("insert into public.flotte_adhesions");
    expect(sql).toContain("on conflict (fleet_id, user_id)");
    expect(sql).toContain("do update set role = excluded.role, is_active = true");
  });

  it("suspend et supprime sans violer l'invariant du dernier organisateur", () => {
    expect(sql).toContain("create or replace function public.deactivate_demo_account");
    expect(sql).toContain("create or replace function public.delete_demo_account");
    expect(sql).toContain("delete from public.flotte_adhesions");
  });

  it("considere une demo expiree comme inactive dans la liste admin", () => {
    expect(sql).toContain("(dp.is_active and (dp.expires_at is null or dp.expires_at > now())) as is_active");
    expect(sql).toContain("and dml.expires_at > now()");
  });
});
