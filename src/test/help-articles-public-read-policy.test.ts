import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = join(
  process.cwd(),
  "supabase/migrations/20260722133000_split_help_articles_write_policies.sql",
);

describe("help articles public read policy", () => {
  it("keeps public reads isolated from admin-only fleet checks", () => {
    const sql = readFileSync(migrationPath, "utf8").toLowerCase();

    expect(sql).toContain("drop policy if exists help_articles_admin_write");
    expect(sql).not.toMatch(/create\s+policy\s+help_articles_admin_write[\s\S]*for\s+all/);
    expect(sql).toMatch(/create\s+policy\s+help_articles_admin_insert[\s\S]*for\s+insert[\s\S]*to\s+authenticated/);
    expect(sql).toMatch(/create\s+policy\s+help_articles_admin_update[\s\S]*for\s+update[\s\S]*to\s+authenticated/);
    expect(sql).toMatch(/create\s+policy\s+help_articles_admin_delete[\s\S]*for\s+delete[\s\S]*to\s+authenticated/);
    expect(sql).toMatch(/create\s+policy\s+help_articles_public_read[\s\S]*for\s+select[\s\S]*using\s*\(\s*is_published\s*=\s*true\s*\)/);
    expect(sql).toContain("grant select on public.help_articles to anon, authenticated");
    expect(sql).toContain("grant execute on function public.is_help_center_admin() to anon, authenticated");
  });
});
