import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = fs.readFileSync(
  path.resolve(
    process.cwd(),
    "supabase/migrations/20260826080755_allow_multiple_active_subscriptions_per_fleet.sql",
  ),
  "utf8",
);

describe("multiple active subscriptions per fleet", () => {
  it("removes the fleet-wide active subscription uniqueness constraint", () => {
    expect(migration).toContain(
      "DROP INDEX IF EXISTS public.abonnements_one_active_per_fleet_idx",
    );
  });

  it("does not cancel the fleet's other active subscriptions during activation", () => {
    expect(migration).not.toMatch(
      /UPDATE\s+public\.abonnements[\s\S]*?id\s*<>\s*p_subscription_id[\s\S]*?status\s*=\s*'active'/i,
    );
  });

  it("creates subscription entitlements per payment instead of reusing another fleet subscription", () => {
    expect(migration).toContain("WHERE a.payment_id = v_payment.id");
    expect(migration).not.toContain(
      "a.status IN ('active', 'inactive', 'pending_payment', 'trial')",
    );
  });
});
