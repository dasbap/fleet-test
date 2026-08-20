import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20260820131000_harden_fleet_invitation_entropy.sql",
  "utf8",
);

describe("fleet invitation entropy security", () => {
  it("generates invitation secrets on the server with cryptographic randomness", () => {
    expect(migration).toContain("gen_random_bytes(12)");
    expect(migration).toContain("'ESAMBA-' || upper(encode(");
  });

  it("does not derive the persisted invitation code from the client supplied value", () => {
    expect(migration).not.toContain("upper(trim(p_code))");
    expect(migration).not.toContain("VALUES (p_fleet_id, p_code");
  });

  it("keeps invitation creation authenticated and permission scoped", () => {
    expect(migration).toContain("rbac_check_permission('member.invite', p_fleet_id)");
    expect(migration).toContain("FROM PUBLIC, anon");
    expect(migration).toContain("TO authenticated");
  });
});
