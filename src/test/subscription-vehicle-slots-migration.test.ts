import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const sql = () =>
  readFileSync(
    "supabase/migrations/20260810120000_subscription_vehicle_slots.sql",
    "utf8",
  );

const repairSql = () =>
  readFileSync(
    "supabase/migrations/20260811110000_repair_admin_subscription_grant_rpcs.sql",
    "utf8",
  );

describe("subscription vehicle slots migration", () => {
  it("centralizes plan capacity and active subscription vehicles", () => {
    const migration = sql();

    expect(migration).toContain("add column if not exists vehicle_slots integer");
    expect(migration).toContain("max_vehicles_per_subscription");
    expect(migration).toContain("subscription_plan_capacity");
    expect(migration).toContain("get_subscription_available_slots");
    expect(migration).toContain("trg_auto_assign_vehicle_subscription");
    expect(migration).toContain("droits_vehicules_one_active_subscription_per_vehicle");
  });

  it("exposes subscription management RPCs with fleet permission checks", () => {
    const migration = sql();

    expect(migration).toContain("list_fleet_subscriptions");
    expect(migration).toContain("get_subscription_detail");
    expect(migration).toContain("transfer_vehicle_subscription");
    expect(migration).toContain("terminate_subscription_early");
    expect(migration).toContain("get_vehicles_by_subscription");
    expect(migration).toContain("admin_list_subscription_grant_options");
    expect(migration).toContain("admin_create_fleet_subscription");
    expect(migration).toContain("vehicle.read_by_subscription");
    expect(migration).toContain("rbac_check_permission");
  });

  it("limits direct subscription granting to super admins with expiry or permanence", () => {
    const migration = sql();

    expect(migration).toContain("if not public.is_platform_super_admin() then");
    expect(migration).toContain("raise exception 'permission_refusee_super_admin_abonnement'");
    expect(migration).toContain("p_expires_at timestamptz default null");
    expect(migration).toContain("p_permanent boolean default false");
    expect(migration).toContain("p_vehicle_slots integer default 1");
    expect(migration).toContain("vehicle_slots_must_be_positive");
    expect(migration).toContain("9999-12-31 23:59:59+00");
    expect(migration).toContain("grant execute on function public.admin_create_fleet_subscription");
  });

  it("allows multiple active subscriptions only when they keep the same vehicle capacity model", () => {
    const migration = sql();

    expect(migration).toContain("subscription_vehicle_capacity_model");
    expect(migration).toContain("'single_vehicle'");
    expect(migration).toContain("'multi_vehicle'");
    expect(migration).toContain("trg_enforce_same_active_subscription_plan");
    expect(migration).toContain("abonnement_type_incompatible");
    expect(migration).toContain("public.subscription_vehicle_capacity_model(");
    expect(migration).toContain("is distinct from v_new_model");
  });

  it("keeps lifecycle and cleanup operations atomic and idempotent", () => {
    const migration = sql();

    expect(migration.toLowerCase()).toContain("for update");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("archive_unsubscribed_vehicles_after_one_year");
    expect(migration).toContain("notify pgrst, 'reload schema'");
  });

  it("keeps vehicle transfers inside the same subscription plan type", () => {
    const migration = readFileSync(
      "supabase/migrations/20260811140000_repair_subscription_slots_view_and_transfer_plan_type.sql",
      "utf8",
    );

    expect(migration).toContain("create or replace function public.transfer_vehicle_subscription");
    expect(migration).toContain("v_source_plan_code");
    expect(migration).toContain("v_target.plan_code");
    expect(migration).toContain("abonnement_type_incompatible");
    expect(migration).toContain("v_source_plan_code is distinct from v_target.plan_code");
    expect(migration).toContain("'available_slots', greatest(0,");
    expect(migration).toContain("'available_slots_label'");
  });

  it("repairs active plan-max slots from the previous same-plan subscription", () => {
    const migration = readFileSync(
      "supabase/migrations/20260811141500_repair_plan_max_subscription_slots_from_previous.sql",
      "utf8",
    );

    expect(migration).toContain("ranked_repairs");
    expect(migration).toContain("a.vehicle_slots = p.max_vehicles");
    expect(migration).toContain("previous.vehicle_slots is not null");
    expect(migration).toContain("previous.vehicle_slots <> p.max_vehicles");
    expect(migration).toContain("set vehicle_slots = ranked.previous_vehicle_slots");
    expect(migration).toContain("notify pgrst, 'reload schema'");
  });

  it("repairs admin grant RPCs when the original version was already marked applied", () => {
    const migration = repairSql();

    expect(migration).toContain("add column if not exists vehicle_slots integer");
    expect(migration).toContain("create or replace function public.admin_list_subscription_grant_options()");
    expect(migration).toContain("create or replace function public.admin_create_fleet_subscription(");
    expect(migration).toContain("p_vehicle_slots integer default 1");
    expect(migration).toContain("permission_refusee_super_admin_abonnement");
    expect(migration).toContain("grant execute on function public.admin_list_subscription_grant_options() to authenticated");
    expect(migration).toContain("grant execute on function public.admin_create_fleet_subscription");
    expect(migration).toContain("notify pgrst, 'reload schema'");
  });
});
