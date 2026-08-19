import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

const hardeningMigration = read(
  "supabase/migrations/20260819114000_harden_business_logic_bypasses.sql",
);
const selectedSubscriptionMigration = read(
  "supabase/migrations/20260819114500_preserve_selected_subscription_assignment.sql",
);

describe("business logic bypass hardening", () => {
  it("keeps demo account provisioning service-role only", () => {
    expect(hardeningMigration).toContain(
      "REVOKE EXECUTE ON FUNCTION public.prospect_create_account",
    );
    expect(hardeningMigration).toContain("FROM authenticated");
    expect(hardeningMigration).toContain("TO service_role");
  });

  it("does not let authenticated users enumerate every invitation secret", () => {
    expect(hardeningMigration).toContain("DROP POLICY IF EXISTS invitations_lecture_auth");
    expect(hardeningMigration).toContain("CREATE POLICY invitations_select_manage_fleet");
    expect(hardeningMigration).toContain("public.has_role(fleet_id, 'organizer'");
    expect(hardeningMigration).toContain("public.has_role(fleet_id, 'manager'");
    expect(hardeningMigration).not.toContain("CREATE POLICY invitations_lecture_auth");
  });

  it("makes existing payment intents immutable to authenticated clients", () => {
    expect(hardeningMigration).toContain("DROP POLICY IF EXISTS paiements_update_manager_org");
    expect(hardeningMigration).toContain(
      "REVOKE UPDATE ON TABLE public.paiements FROM authenticated",
    );
  });

  it("removes the generic zero-member fleet takeover bootstrap", () => {
    const membershipStart = hardeningMigration.indexOf(
      "CREATE OR REPLACE FUNCTION public.creer_ou_mettre_a_jour_adhesion_flotte",
    );
    const onboardingStart = hardeningMigration.indexOf(
      "CREATE OR REPLACE FUNCTION public.creer_onboarding_organisation_flotte_et_adhesion",
    );
    const membershipFunction = hardeningMigration.slice(membershipStart, onboardingStart);

    expect(membershipFunction).toContain("member.invite");
    expect(membershipFunction).toContain("member.update_role");
    expect(membershipFunction).toContain("member.remove");
    expect(membershipFunction).not.toContain("v_fleet_has_active_members");
    expect(membershipFunction).not.toContain("NOT v_fleet_has_active_members");
  });

  it("does not let managers remove members through the generic RPC", () => {
    expect(hardeningMigration).toContain(
      "v_check := public.rbac_check_permission('member.remove', p_fleet_id)",
    );
  });

  it("restricts legacy tenant-bypassing seed helpers", () => {
    expect(hardeningMigration).toContain(
      "REVOKE EXECUTE ON FUNCTION public.creer_flotte_esamba(uuid, text, text) FROM PUBLIC, anon, authenticated",
    );
    expect(hardeningMigration).toContain(
      "REVOKE EXECUTE ON FUNCTION public.creer_vehicule_esamba(uuid, text, text, text, integer, integer) FROM PUBLIC, anon, authenticated",
    );
  });

  it("only auto-activates inactive subscriptions that are valid demo entitlements", () => {
    expect(hardeningMigration).toContain("v_sub.payment_id IS NULL");
    expect(hardeningMigration).toContain("v_sub.trial_ends_at > now()");
    expect(hardeningMigration).toContain("dp.demo_role = 'organizer'");
    expect(selectedSubscriptionMigration).toContain("v_target.payment_id IS NULL");
    expect(selectedSubscriptionMigration).toContain("v_target.trial_ends_at > now()");
  });

  it("binds paid vehicle rights to the charged vehicle count at ingress and webhook", () => {
    const checkout = read("src/server/domain/billingCheckout.ts");
    const mobileMoney = read("src/server/domain/mobileMoneyInitiate.ts");
    const webhook = read("src/server/domain/billing/processInboundPaymentWebhook.ts");

    expect(checkout).toContain("vehicleIds.length !== vehicleCount");
    expect(mobileMoney).toContain("vehicleIds.length !== vehicleCount");
    expect(webhook).toContain("payload.vehicleIds.length !== payload.vehicleCount");
    expect(webhook).toContain("(selectedVehicles ?? []).length !== vehicleCount");
  });

  it("uses cryptographic entropy for checkout and invitation references", () => {
    const checkout = read("src/server/domain/billingCheckout.ts");
    const invitationCode = read("src/lib/invitation-code.ts");

    expect(checkout).toContain("crypto.randomUUID()");
    expect(checkout).not.toContain("Math.random");
    expect(invitationCode).toContain("crypto.getRandomValues");
    expect(invitationCode).not.toContain("Math.random");
  });
});
