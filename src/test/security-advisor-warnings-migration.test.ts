import { existsSync, readFileSync } from "node:fs";

const migrationPath =
  "supabase/migrations/20260824134000_harden_advisor_warning_functions.sql";

const searchPathFunctions = [
  "set_updated_at_tracking",
  "set_support_updated_at",
  "is_vehicle_subscription_status_active",
  "set_notification_tokens_updated_at",
];

const adminAndInternalFunctions = [
  "admin_answer_faq_question",
  "admin_audit_table_change",
  "admin_auto_process_demo_requests",
  "admin_create_fleet_subscription",
  "admin_delete_faq_question",
  "admin_finalize_demo_request",
  "admin_list_all_accounts",
  "admin_list_audit_logs",
  "admin_list_demo_requests",
  "admin_list_demo_sessions",
  "admin_list_faq_questions",
  "admin_list_subscription_grant_options",
  "admin_log_action",
  "admin_set_fleet_plan",
  "admin_update_demo_request_auto_mode",
  "admin_upsert_faq_article",
  "archive_unsubscribed_vehicles_after_one_year",
  "update_demo_account_expiration",
  "write_audit_log",
];

const triggerFunctions = [
  "trg_auto_assign_vehicle_subscription",
  "trg_enforce_fleet_subscription_total_vehicle_slots",
  "trg_enforce_same_active_subscription_plan",
  "trg_enforce_subscription_vehicle_slot_limit",
];

describe("security advisor warning function hardening migration", () => {
  it("sets explicit search_path for advisor-reported mutable functions", () => {
    expect(existsSync(migrationPath)).toBe(true);

    const sql = readFileSync(migrationPath, "utf8").toLowerCase();

    for (const functionName of searchPathFunctions) {
      expect(sql).toContain(`'${functionName}'`);
    }

    expect(sql).toContain("alter function %s set search_path = public");
  });

  it("removes anonymous execution from admin and internal security definer functions only", () => {
    expect(existsSync(migrationPath)).toBe(true);

    const sql = readFileSync(migrationPath, "utf8").toLowerCase();

    for (const functionName of adminAndInternalFunctions) {
      expect(sql).toContain(`'${functionName}'`);
    }

    expect(sql).toContain(
      "revoke execute on function %s from public, anon",
    );
    expect(sql).toContain(
      "-- admin and internal rpcs keep authenticated execution for app flows.",
    );
  });

  it("removes rest execution from trigger-only functions", () => {
    expect(existsSync(migrationPath)).toBe(true);

    const sql = readFileSync(migrationPath, "utf8").toLowerCase();

    for (const functionName of triggerFunctions) {
      expect(sql).toContain(`'${functionName}'`);
    }

    expect(sql).toContain(
      "revoke execute on function %s from public, anon, authenticated",
    );
    expect(sql).toContain("grant execute on function %s to service_role");
    expect(sql).toContain("notify pgrst, 'reload schema'");
  });
});
