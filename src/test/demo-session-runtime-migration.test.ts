import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260721120000_restore_demo_session_runtime.sql",
);

describe("demo session runtime migration", () => {
  it("restores the frontend demo session RPC and refreshes PostgREST", () => {
    expect(existsSync(migrationPath)).toBe(true);

    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("create table if not exists public.demo_profiles");
    expect(sql).toContain("create or replace function public.demo_upsert_session");
    expect(sql).toContain("grant execute on function public.demo_upsert_session(text, text) to authenticated");
    expect(sql).toContain("notify pgrst, 'reload schema'");
  });
});
