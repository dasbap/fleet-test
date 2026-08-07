import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const migration = () =>
  readFileSync(
    "supabase/migrations/20260803134000_admin_audit_and_demo_default_pro_plan.sql",
    "utf8",
  );

describe("admin audit and demo default pro plan migration", () => {
  it("creates an admin audit trail for platform panel actions", () => {
    const sql = migration();

    expect(sql).toContain("create table if not exists public.admin_audit_logs");
    expect(sql).toContain("create or replace function public.admin_log_action");
    expect(sql).toContain("create or replace function public.admin_list_audit_logs");
    expect(sql).toContain("create trigger admin_audit_demo_requests");
    expect(sql).toContain("create trigger admin_audit_faq_questions");
    expect(sql).toContain("create trigger admin_audit_help_articles");
  });

  it("makes accepted demo accounts organizer-first with a default pro fleet plan", () => {
    const sql = migration();

    expect(sql).toContain("'organizer'");
    expect(sql).toContain("'default_plan_code', 'pro'");
    expect(sql).toContain("create or replace function public.admin_set_fleet_plan");
    expect(sql).toContain("create trigger demo_organizer_plan_after_membership");
    expect(sql).toContain("p_plan_code text");
    expect(sql).toContain("lower(trim(p_plan_code))");
  });
});
