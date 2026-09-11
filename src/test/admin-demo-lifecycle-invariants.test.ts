import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath =
  "supabase/migrations/20260904114000_fix_admin_demo_lifecycle_invariants.sql";
const hardeningPath =
  "supabase/migrations/20260904150000_harden_admin_security_invariants.sql";

describe("admin demo lifecycle invariants", () => {
  const sql = readFileSync(migrationPath, "utf8");
  const hardeningSql = readFileSync(hardeningPath, "utf8");

  it("autorise uniquement le bypass admin des organisateurs demo", () => {
    expect(hardeningSql).toContain("current_setting('app.demo_lifecycle_bypass', true) = 'on'");
    expect(hardeningSql).toContain("public.is_platform_admin()");
    expect(sql).toContain("set_config('app.demo_lifecycle_bypass', 'on', true)");
  });

  it("borne le bypass aux flottes reellement demo", () => {
    expect(hardeningSql).toContain("dp.user_id = old.user_id");
    expect(hardeningSql).toContain("join public.flottes f on f.id = old.fleet_id");
    expect(hardeningSql).toContain("f.is_demo = true");
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

  it("force l'acteur d'audit depuis la session authentifiee", () => {
    expect(hardeningSql).toContain("new.deactivated_by := auth.uid()");
    expect(hardeningSql).toContain("new.performed_by := auth.uid()");
  });

  it("retire l'execution PUBLIC des fonctions privilegiees", () => {
    expect(hardeningSql).toContain(
      "revoke execute on function public.deactivate_demo_account(uuid, uuid, text) from public, anon",
    );
    expect(hardeningSql).toContain(
      "revoke execute on function public.admin_delete_vehicle(uuid) from public, anon",
    );
  });
});
