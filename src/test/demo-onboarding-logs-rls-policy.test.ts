import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = join(
  process.cwd(),
  "supabase/migrations/20260722164000_allow_demo_onboarding_log_self_insert.sql",
);

describe("demo onboarding logs RLS policy", () => {
  it("allows an active demo user to insert only their own onboarding logs", () => {
    const sql = readFileSync(migrationPath, "utf8").toLowerCase();

    expect(sql).toContain("create policy demo_onboarding_logs_self_insert");
    expect(sql).toContain("for insert");
    expect(sql).toContain("with check");
    expect(sql).toContain("auth.uid() = user_id");
    expect(sql).toContain("from public.demo_profiles dp");
    expect(sql).toContain("dp.is_active = true");
    expect(sql).toContain("grant insert on table public.demo_onboarding_logs to authenticated");
  });
});
