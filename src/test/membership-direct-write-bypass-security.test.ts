import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20260820132000_close_membership_direct_write_bypasses.sql",
  "utf8",
);

describe("membership direct-write business bypasses", () => {
  it("does not let managers create organizers through the membership RPC", () => {
    expect(migration).toContain("p_role = 'organizer'::public.role_type");
    expect(migration).toContain("rbac_check_permission('member.update_role', p_fleet_id)");
    expect(migration).toContain("seul organizer peut creer un organizer");
  });

  it("does not let managers create organizer rows directly through RLS", () => {
    expect(migration).toContain("CREATE POLICY memberships_insert_role_bounded");
    expect(migration).toContain("has_role(fleet_id, 'manager'::public.role_type)");
    expect(migration).toContain("role IS DISTINCT FROM 'organizer'::public.role_type");
  });

  it("does not let managers update or delete memberships directly", () => {
    expect(migration).toContain("DROP POLICY IF EXISTS memberships_update_manager_org");
    expect(migration).toContain("DROP POLICY IF EXISTS memberships_delete_manager_org");
    expect(migration).toContain("CREATE POLICY memberships_update_organizer_only");
    expect(migration).toContain("CREATE POLICY memberships_delete_organizer_only");
  });
});
