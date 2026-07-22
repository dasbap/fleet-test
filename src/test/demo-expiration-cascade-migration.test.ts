import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath =
  "supabase/migrations/20260722120000_enforce_account_provisioning_and_demo_expiry_cascade.sql";

describe("demo expiration cascade migration", () => {
  it("supprime le compte demo expire et les comptes crees par ce compte", () => {
    expect(existsSync(migrationPath)).toBe(true);
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("alter table public.profils");
    expect(sql).toContain("created_by uuid");
    expect(sql).toContain("with recursive accounts_to_delete");
    expect(sql).toContain("p.created_by =");
    expect(sql).toContain("delete from auth.users");
    expect(sql).toContain("return jsonb_build_object");
  });
});
