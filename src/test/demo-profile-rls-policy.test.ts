import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = join(
  process.cwd(),
  "supabase/migrations/20260722163000_allow_demo_profile_self_read.sql",
);

describe("demo profile RLS policy", () => {
  it("allows demo users to read their own demo profile without exposing other profiles", () => {
    const sql = readFileSync(migrationPath, "utf8").toLowerCase();

    expect(sql).toContain("create policy demo_profiles_self_read");
    expect(sql).toContain("for select");
    expect(sql).toContain("using (auth.uid() = user_id)");
    expect(sql).toContain("grant select on table public.demo_profiles to authenticated");
  });
});
