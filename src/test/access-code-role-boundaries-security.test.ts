import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20260820115000_harden_access_code_role_boundaries.sql",
  "utf8",
);

describe("access-code role boundaries", () => {
  it("prevents dev and commercial roles from minting internal-role codes", () => {
    expect(migration).toContain(
      "p_universe = 'internal' AND v_creator_role NOT IN ('super_admin', 'admin')",
    );
    expect(migration).toContain("'internal_code_admin_required'");
    expect(migration).toContain(
      "v_creator_role NOT IN ('super_admin', 'admin', 'dev', 'commercial')",
    );
  });

  it("prevents internal access codes from being bound to a fleet", () => {
    expect(migration).toContain("p_fleet_id IS NOT NULL AND p_universe = 'internal'");
    expect(migration).toContain("'internal_code_cannot_bind_fleet'");
  });

  it("keeps access-code revocation out of the read-only dev role", () => {
    expect(migration).toContain(
      "v_revoker_role NOT IN ('super_admin', 'admin')",
    );
    expect(migration).not.toContain("v_revoker_role NOT IN ('admin', 'dev')");
  });
});
