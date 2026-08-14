import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const migrationSource = () =>
  readFileSync(
    "supabase/migrations/20260811114500_use_subscription_vehicle_slots_in_billing_context.sql",
    "utf8",
  );

const lifecycleColumnsMigrationSource = () =>
  readFileSync(
    "supabase/migrations/20260811124500_ensure_abonnements_lifecycle_columns_for_billing_context.sql",
    "utf8",
  );

const accessHookSource = () =>
  readFileSync("src/hooks/useSubscriptionAccess.ts", "utf8");

const billingPageSource = () =>
  readFileSync("src/features/billing/screens/BillingPage.tsx", "utf8");

const esambaWebBillingSource = () =>
  readFileSync("apps/esamba-web/src/lib/dashboard/fetch-billing.ts", "utf8");

const fleetBillingServiceSource = () =>
  readFileSync("src/services/fleet-billing.service.ts", "utf8");

const accountStatusSource = () =>
  readFileSync("src/hooks/useAccountStatus.ts", "utf8");

const capacitySource = () =>
  readFileSync("src/lib/subscription-vehicle-capacity.ts", "utf8");

describe("subscription vehicle slots billing context", () => {
  it("returns granted subscription slots instead of the Pro catalog vehicle ceiling", () => {
    const migration = migrationSource();

    expect(migration).toContain("a.vehicle_slots");
    expect(migration).toContain("coalesce(a.vehicle_slots, p.max_vehicles_per_subscription)");
    expect(migration).toContain("'vehicle_slots',                coalesce(v_vehicle_slots, 999999)");
    expect(migration).toContain("'max_vehicles',                 coalesce(v_vehicle_slots, v_max_vehicles, 999999)");
    expect(migration).toContain("'maxVehicles', coalesce(nullif((select n from total_slots), 0), 3)");
    expect(migration).toContain("notify pgrst, 'reload schema'");
  });

  it("ensures lifecycle columns used by get_fleet_billing_context exist on older remotes", () => {
    const migration = lifecycleColumnsMigrationSource();

    expect(migration).toContain("alter table public.abonnements");
    expect(migration).toContain("add column if not exists trial_ends_at timestamptz");
    expect(migration).toContain("add column if not exists grace_until timestamptz");
    expect(migration).toContain("notify pgrst, 'reload schema'");
  });

  it("uses vehicleSlots as the effective frontend limit before falling back to plan max", () => {
    expect(accessHookSource()).toContain("sumActiveSubscriptionVehicleCapacity");
    expect(accessHookSource()).toContain("resolveEffectiveVehicleSlots");
    expect(accessHookSource()).toContain("vehicleSlots,");
    expect(fleetBillingServiceSource()).toContain(
      "Math.min(context.vehicleSlots, context.maxVehicles)",
    );
  });

  it("shows user-facing account and billing limits from active subscription slots", () => {
    const source = accountStatusSource();
    const billingPage = billingPageSource();
    const capacity = capacitySource();

    expect(source).toContain("id, status, starts_at, ends_at, vehicle_slots");
    expect(source).toContain("trial_ends_at, grace_until");
    expect(source).toContain("const { data: activeSubscriptions }");
    expect(source).toContain("subscriptionVehicleSlots ?? sub?.vehicle_slots");
    expect(source).toContain("vehicle_slots:   effectiveVehicleSlots");
    expect(source).toContain("vehicle_slots: effectiveVehicleSlots");
    expect(source).toContain("period_start:    sub.starts_at");
    expect(source).toContain("period_end:      sub.ends_at");
    expect(source).toContain(".eq('status', 'ok')");
    expect(billingPage).toContain("const subscriptionSlots = sumActiveSubscriptionVehicleCapacity");
    expect(billingPage).toContain("const effectiveVehicleSlots = resolveEffectiveVehicleSlots");
    expect(billingPage).toContain("billing.isLoading || subscriptions.isLoading");
    expect(billingPage).toContain("effectiveVehicleSlots >= 999_999 ? \"∞\" : effectiveVehicleSlots");
    expect(accessHookSource()).toContain("billing.isLoading || subscriptions.isLoading || !billing.data");
    expect(esambaWebBillingSource()).toContain(
      "billing.vehicle_slots ?? billing.max_vehicles ?? 3",
    );
    expect(capacity).toContain("total += Math.max(0, subscription.vehicleCapacity)");
  });
});
