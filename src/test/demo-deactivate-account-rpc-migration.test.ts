import { existsSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const migrationPath =
  "supabase/migrations/20260722170000_restore_deactivate_demo_account_rpc.sql";

describe("deactivate demo account RPC migration", () => {
  it("restores the RPC used by the admin demo panel", () => {
    expect(existsSync(migrationPath)).toBe(true);
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("create or replace function public.deactivate_demo_account");
    expect(sql).toContain("public.is_platform_admin()");
    expect(sql).toContain("set is_active = false");
    expect(sql).toContain("delete from public.flotte_adhesions");
    expect(sql).toContain("grant execute on function public.deactivate_demo_account(uuid, uuid, text) to authenticated");
    expect(sql).toContain("notify pgrst, 'reload schema'");
  });
});
