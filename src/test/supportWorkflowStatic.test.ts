import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("support and demo workflow source contract", () => {
  it("keeps public support inside FAQ instead of WhatsApp", () => {
    const contactForm = readFileSync("src/components/landing/ContactDemoForm.tsx", "utf8");
    const publicLayout = readFileSync("src/components/landing/PublicPageLayout.tsx", "utf8");

    expect(contactForm).not.toContain("DEMO_WHATSAPP_URL");
    expect(contactForm).not.toContain("window.open");
    expect(publicLayout).not.toContain("WhatsAppButton");
  });

  it("lets signed-in users browse the public home and shows dashboard navigation", () => {
    const appRoutes = readFileSync("src/app/routes/app.routes.tsx", "utf8");
    const navbar = readFileSync("src/components/landing/Navbar.tsx", "utf8");

    expect(appRoutes).not.toContain("function AuthAwareIndex");
    expect(navbar).toContain(">Dashboard<");
    expect(navbar).toContain("{!user && demoNav");
  });

  it("adds authenticated FAQ questions with admin answer and alert notification RPCs", () => {
    const migration = readFileSync(
      "supabase/migrations/20260803120000_support_faq_questions_and_demo_requests_workflow.sql",
      "utf8",
    );
    const adminBlockMigration = readFileSync(
      "supabase/migrations/20260803123000_block_admin_faq_question_submission.sql",
      "utf8",
    );
    const adminDeleteMigration = readFileSync(
      "supabase/migrations/20260803124000_admin_delete_faq_question.sql",
      "utf8",
    );

    expect(migration).toContain("create table if not exists public.faq_questions");
    expect(migration).toContain("create or replace function public.submit_faq_question");
    expect(migration).toContain("create or replace function public.admin_answer_faq_question");
    expect(migration).toContain("insert into public.alertes_automatiques");
    expect(migration).toContain("faq_answer");
    expect(adminBlockMigration).toContain("public.support_current_user_is_admin()");
    expect(adminBlockMigration).toContain("admins_cannot_submit_faq_questions");
    expect(adminDeleteMigration).toContain("create or replace function public.admin_delete_faq_question");
    expect(adminDeleteMigration).toContain("public.support_current_user_is_admin()");
    expect(adminDeleteMigration).toContain("delete from public.faq_questions");
  });

  it("adds admin-managed demo request decisions and a switchable 48h auto action", () => {
    const migration = readFileSync(
      "supabase/migrations/20260803120000_support_faq_questions_and_demo_requests_workflow.sql",
      "utf8",
    );

    expect(migration).toContain("public.demo_request_settings");
    expect(migration).toContain("create table if not exists public.demo_requests");
    expect(migration).toContain("admin_list_demo_requests");
    expect(migration).toContain("admin_finalize_demo_request");
    expect(migration).toContain("admin_update_demo_request_auto_mode");
    expect(migration).toContain("admin_auto_process_demo_requests");
    expect(migration).toContain("created_at < now() - interval '48 hours'");
  });

  it("exposes demo requests in admin UI and FAQ answers in alerts", () => {
    const demoPage = readFileSync("src/pages/admin/DemoAdminPage.tsx", "utf8");
    const alertTypes = readFileSync("src/types/alert.ts", "utf8");
    const alertDtoTypes = readFileSync("src/types/dto/alert.dto.ts", "utf8");

    expect(demoPage).toContain("DemoRequestsPanel");
    expect(demoPage).toContain('TabsTrigger value="requests"');
    expect(alertTypes).toContain('"faq_answer"');
    expect(alertDtoTypes).toContain('"faq_answer"');
  });
});
