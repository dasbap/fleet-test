import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = join(
  process.cwd(),
  "supabase/migrations/20260722133000_split_help_articles_write_policies.sql"
);

describe("help articles public read policy", () => {
  it("keeps public reads isolated from admin-only fleet checks", () => {
    const sql = readFileSync(migrationPath, "utf8").toLowerCase();

    expect(sql).toContain("drop policy if exists help_articles_admin_write");
    expect(sql).not.toMatch(
      /create\s+policy\s+help_articles_admin_write[\s\S]*for\s+all/
    );
    expect(sql).toMatch(
      /create\s+policy\s+help_articles_admin_insert[\s\S]*for\s+insert[\s\S]*to\s+authenticated/
    );
    expect(sql).toMatch(
      /create\s+policy\s+help_articles_admin_update[\s\S]*for\s+update[\s\S]*to\s+authenticated/
    );
    expect(sql).toMatch(
      /create\s+policy\s+help_articles_admin_delete[\s\S]*for\s+delete[\s\S]*to\s+authenticated/
    );
    expect(sql).toMatch(
      /create\s+policy\s+help_articles_public_read[\s\S]*for\s+select[\s\S]*using\s*\(\s*is_published\s*=\s*true\s*\)/
    );
    expect(sql).toContain(
      "grant select on public.help_articles to anon, authenticated"
    );
    expect(sql).toContain(
      "grant execute on function public.is_help_center_admin() to anon, authenticated"
    );
  });

  it("lets platform admins write FAQ help articles without fleet membership", () => {
    const sql = readFileSync(
      join(
        process.cwd(),
        "supabase/migrations/20260803125000_fix_help_articles_platform_admin_write.sql"
      ),
      "utf8"
    ).toLowerCase();

    expect(sql).toMatch(
      /create\s+policy\s+help_articles_admin_insert[\s\S]*public\.is_platform_admin\(\)/
    );
    expect(sql).toMatch(
      /create\s+policy\s+help_articles_admin_update[\s\S]*public\.is_platform_admin\(\)/
    );
    expect(sql).toMatch(
      /with\s+check\s*\([\s\S]*public\.is_platform_admin\(\)/
    );
    expect(sql).toMatch(
      /create\s+policy\s+help_articles_admin_delete[\s\S]*public\.is_platform_admin\(\)/
    );
    expect(sql).toContain(
      "grant insert, update, delete on public.help_articles to authenticated"
    );
  });

  it("adds an admin FAQ upsert RPC to avoid direct help_articles PATCH RLS failures", () => {
    const sql = readFileSync(
      join(
        process.cwd(),
        "supabase/migrations/20260803130000_admin_upsert_faq_article_rpc.sql"
      ),
      "utf8"
    ).toLowerCase();

    expect(sql).toContain(
      "create or replace function public.admin_upsert_faq_article"
    );
    expect(sql).toContain("security definer");
    expect(sql).toContain("public.is_platform_admin()");
    expect(sql).toContain("update public.help_articles");
    expect(sql).toContain("insert into public.help_articles");
    expect(sql).toContain(
      "grant execute on function public.admin_upsert_faq_article"
    );
  });

  it("lets admins select hidden FAQ help articles in the admin module", () => {
    const sql = readFileSync(
      join(
        process.cwd(),
        "supabase/migrations/20260803131000_help_articles_admin_select_hidden.sql"
      ),
      "utf8"
    ).toLowerCase();

    expect(sql).toContain("create policy help_articles_admin_select");
    expect(sql).toMatch(/for\s+select[\s\S]*to\s+authenticated/);
    expect(sql).toContain("public.is_platform_admin()");
    expect(sql).toContain("public.is_help_center_admin()");
    expect(sql).toContain(
      "grant select on public.help_articles to authenticated"
    );
  });
});
