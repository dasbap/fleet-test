import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260722150000_cap_demo_expiration_from_creation.sql",
);

describe("admin demo expiration policy migration", () => {
  it("caps admin demo expiration changes at one month from creation", () => {
    expect(existsSync(migrationPath)).toBe(true);

    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("created_at + interval '1 month'");
    expect(sql).toContain("max_demo_extension_exceeded");
    expect(sql).toContain("grant execute on function public.reactivate_demo_account(uuid, uuid, integer) to authenticated");
    expect(sql).toContain("notify pgrst, 'reload schema'");
  });
});
