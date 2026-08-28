import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

const hardeningMigration = read(
  "supabase/migrations/20260819114000_harden_business_logic_bypasses.sql",
);
const selectedSubscriptionMigration = read(
  "supabase/migrations/20260819114500_preserve_selected_subscription_assignment.sql",
);
const sensitiveRpcMigration = read(
  "supabase/migrations/20260819115000_scope_sensitive_runtime_rpcs.sql",
);
const magicLinkMigration = read(
  "supabase/migrations/20260819115500_consume_demo_magic_links_once.sql",
);
const accessCodeMigration = read(
  "supabase/migrations/20260819120000_harden_access_code_identity_binding.sql",
);
const internalRoleMigration = read(
  "supabase/migrations/20260819120500_fix_internal_role_privilege_boundaries.sql",
);
const internalRlsMigration = read(
  "supabase/migrations/20260819121000_align_internal_role_permissions.sql",
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

  it("keeps invitation acceptance grants idempotent when the legacy rpc is absent", () => {
    expect(hardeningMigration).toContain(
      "IF to_regprocedure('public.accepter_invitation(text)') IS NOT NULL THEN",
    );
    expect(hardeningMigration).toContain(
      "REVOKE EXECUTE ON FUNCTION public.accepter_invitation(text) FROM PUBLIC",
    );
    expect(hardeningMigration).toContain(
      "REVOKE EXECUTE ON FUNCTION public.accepter_invitation(text) FROM anon",
    );
    expect(hardeningMigration).toContain(
      "GRANT EXECUTE ON FUNCTION public.accepter_invitation(text) TO authenticated",
    );
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
    expect(internalRoleMigration).toContain(
      "v_check := public.rbac_check_permission('member.remove', v_fleet_id)",
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

  it("binds a signed webhook to the provider recorded on the payment", () => {
    const route = read("src/server/http/routes/webhooksPayment.ts");
    const webhook = read("src/server/domain/billing/processInboundPaymentWebhook.ts");

    expect(route).toContain("expectedPaymentProvider");
    expect(webhook).toContain("payment.provider !== expectedProvider");
  });

  it("uses cryptographic entropy for checkout, invitation and access codes", () => {
    const checkout = read("src/server/domain/billingCheckout.ts");
    const invitationCode = read("src/lib/invitation-code.ts");

    expect(checkout).toContain("crypto.randomUUID()");
    expect(checkout).not.toContain("Math.random");
    expect(invitationCode).toContain("crypto.getRandomValues");
    expect(invitationCode).not.toContain("Math.random");
    expect(accessCodeMigration).toContain("gen_random_bytes(8)");
    expect(accessCodeMigration).not.toContain("md5(random()::text)");
  });

  it("keeps global maintenance jobs service-role only", () => {
    expect(sensitiveRpcMigration).toContain(
      "IF to_regprocedure('public.nettoyer_base_donnees(boolean)') IS NOT NULL THEN",
    );
    expect(sensitiveRpcMigration).toContain(
      "REVOKE EXECUTE ON FUNCTION public.nettoyer_base_donnees(boolean) FROM PUBLIC, anon, authenticated",
    );
    expect(sensitiveRpcMigration).toContain(
      "GRANT EXECUTE ON FUNCTION public.nettoyer_base_donnees(boolean) TO service_role",
    );
  });

  it("scopes billing capacity and refund RPCs to the actual target fleet", () => {
    expect(sensitiveRpcMigration).toContain("permission_refusee_abonnement");
    expect(sensitiveRpcMigration).toContain("rbac_check_permission('vehicle.create', p_fleet_id)");
    expect(sensitiveRpcMigration).toContain("rbac_check_permission('fleet.view', p_fleet_id)");
    expect(sensitiveRpcMigration).toContain("v_payload_fleet_id");
    expect(sensitiveRpcMigration).toContain("v_abo.fleet_id IS DISTINCT FROM v_payload_fleet_id");
  });

  it("consumes demo authentication links atomically once", () => {
    expect(magicLinkMigration).toContain("FOR UPDATE");
    expect(magicLinkMigration).toContain("is_active = false");
    expect(magicLinkMigration).toContain(
      "GRANT EXECUTE ON FUNCTION public.demo_validate_magic_link(uuid) TO service_role",
    );
  });

  it("bootstraps access universe enum before using access-code helpers", () => {
    expect(accessCodeMigration).toContain("CREATE TYPE public.access_universe AS ENUM");
    expect(accessCodeMigration).toContain("'internal', 'temporary', 'real'");
    expect(accessCodeMigration.indexOf("CREATE TYPE public.access_universe AS ENUM")).toBeLessThan(
      accessCodeMigration.indexOf("RETURNS public.access_universe"),
    );
  });
  it("bootstraps access-code tables before compiling access-code consumers", () => {
    expect(accessCodeMigration).toContain("CREATE TABLE IF NOT EXISTS public.access_codes");
    expect(accessCodeMigration).toContain("CREATE TABLE IF NOT EXISTS public.access_code_uses");
    expect(accessCodeMigration).toContain("CREATE OR REPLACE FUNCTION public.access_code_validate");
    expect(accessCodeMigration.indexOf("CREATE TABLE IF NOT EXISTS public.access_codes")).toBeLessThan(
      accessCodeMigration.indexOf("v_row public.access_codes%ROWTYPE"),
    );
    expect(accessCodeMigration.indexOf("CREATE OR REPLACE FUNCTION public.access_code_validate")).toBeLessThan(
      accessCodeMigration.indexOf("CREATE OR REPLACE FUNCTION public.access_code_consume"),
    );
  });
  it("binds access-code create, consume and revoke identities to auth.uid", () => {
    expect(accessCodeMigration).toContain("p_user_id IS DISTINCT FROM auth.uid()");
    expect(accessCodeMigration).toContain("p_creator_id IS DISTINCT FROM auth.uid()");
    expect(accessCodeMigration).toContain("p_revoker IS DISTINCT FROM auth.uid()");
  });

  it("does not treat commercial or dev staff as platform admins", () => {
    expect(internalRoleMigration).toContain(
      "ap.internal_role IN ('super_admin', 'admin')",
    );
    expect(internalRoleMigration).toContain("RETURN public.is_platform_admin()");
  });

  it("keeps commercial fleet visibility limited to demo fleets", () => {
    expect(internalRlsMigration).toContain("ap.internal_role = 'commercial'");
    expect(internalRlsMigration).toContain("THEN is_demo = true");
    expect(internalRlsMigration).toContain("ap.internal_role IN ('super_admin', 'admin', 'dev')");
  });

  it("requires platform admin for creation of internal access codes", () => {
    expect(internalRlsMigration).toContain(
      "v_creator_role NOT IN ('super_admin', 'admin')",
    );
    expect(internalRlsMigration).toContain("internal_code_admin_required");
  });
});
