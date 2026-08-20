import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20260820133000_close_tenant_creation_rls_bypasses.sql",
  "utf8",
);

describe("tenant creation RLS business bypasses", () => {
  it("does not allow arbitrary authenticated organisation inserts", () => {
    expect(migration).toContain("DROP POLICY IF EXISTS orgs_insert_authenticated");
    expect(migration).toContain("CREATE POLICY orgs_insert_platform_admin_only");
    expect(migration).toContain("WITH CHECK (public.is_platform_admin())");
  });

  it("aligns direct fleet creation with organizer-only RBAC", () => {
    expect(migration).toContain("DROP POLICY IF EXISTS flottes_insert_manager_org_org");
    expect(migration).toContain("CREATE POLICY flottes_insert_organizer_scope");
    expect(migration).toContain("fa.role = 'organizer'::public.role_type");
    expect(migration).not.toContain("OR NOT EXISTS (SELECT 1 FROM flottes");
  });
});
