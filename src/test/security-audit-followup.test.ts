import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

const migration = read("supabase/migrations/20260820100000_security_audit_followup.sql");
const paymentMigration = read("supabase/migrations/20260820101000_extend_secure_payment_intent.sql");

describe("security audit follow-up", () => {
  it("limits platform RBAC override to real platform admins", () => {
    expect(migration).toContain("IF public.is_platform_admin() THEN");
    expect(migration).toContain("v_internal_role = 'dev'");
    expect(migration).toContain("v_internal_role = 'commercial'");
    expect(migration).toContain("'internal_read_only'");
    expect(migration).toContain("'demo_read_only'");
  });

  it("binds internal-role lookup to the current identity", () => {
    expect(migration).toContain("p_user_id IS DISTINCT FROM auth.uid()");
    expect(migration).toContain("permission_refusee_identite");
  });

  it("removes direct client access to access-code storage and rotates legacy codes", () => {
    expect(migration).toContain("REVOKE ALL ON TABLE public.access_codes FROM PUBLIC, anon, authenticated");
    expect(migration).toContain("REVOKE ALL ON TABLE public.access_code_uses FROM PUBLIC, anon, authenticated");
    expect(migration).toContain("code ~ '^[A-Z]+-[A-Z0-9]+-[A-Z0-9]+-[0-9]{4}$'");
  });

  it("makes payment intent creation server-owned", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.create_payment_intent");
    expect(migration).toContain("REVOKE INSERT, UPDATE, DELETE ON TABLE public.paiements FROM PUBLIC, anon, authenticated");
    expect(paymentMigration).toContain("p_expected_amount IS DISTINCT FROM v_amount");
    expect(paymentMigration).toContain("p_provider NOT IN ('manual', 'cinetpay', 'notch', 'orange_money', 'mtn_momo', 'fapshi')");
  });

  it("uses secured payment creation in every active initiation path", () => {
    const checkout = read("src/server/domain/billingCheckout.ts");
    const mobileMoney = read("src/server/domain/mobileMoneyInitiate.ts");
    const notch = read("src/server/domain/notchPayInitiate.ts");
    const nextBillingEnv = read("apps/esamba-web/src/lib/api/billing-env.ts");
    const clientMobileMoney = read("src/services/mobile-money.service.ts");
    const nextNotch = read("apps/esamba-web/src/app/api/payments/notchpay/initiate/route.ts");
    const nextFapshi = read("apps/esamba-web/src/app/api/payments/fapshi/initiate/route.ts");

    expect(checkout).toContain("createServerOwnedPaymentIntent");
    expect(mobileMoney).toContain("createServerOwnedPaymentIntent");
    expect(notch).toContain("createServerOwnedPaymentIntent");
    expect(clientMobileMoney).not.toContain('.from("paiements")');
    expect(nextNotch).toContain('supabase.rpc(\n    "create_payment_intent"');
    expect(nextFapshi).toContain('supabase.rpc(\n    "create_payment_intent"');
    expect(nextNotch).not.toContain("body.amount");
    expect(nextFapshi).not.toContain("body.amount");
    expect(nextBillingEnv).toContain("randomUUID()");
    expect(nextBillingEnv).not.toContain("Math.random");
  });

  it("keeps GPS nonces alive through the signed timestamp validity window", () => {
    const gps = read("src/server/http/routes/gpsIngest.ts");
    expect(gps).toContain("MAX_GATEWAY_FUTURE_SKEW_MS");
    expect(gps).toContain("timestamp - now > MAX_GATEWAY_FUTURE_SKEW_MS");
    expect(gps).toContain("timestamp + MAX_GATEWAY_CLOCK_SKEW_MS");
    expect(gps).not.toContain("new Date(now + MAX_GATEWAY_CLOCK_SKEW_MS)");
  });

  it("never distributes temporary prospect passwords", () => {
    const prospect = read("supabase/functions/create-prospect-account/index.ts");
    expect(prospect).toContain("resetPasswordForEmail");
    expect(prospect).toContain('password_delivery: "reset_email"');
    expect(prospect).not.toContain("temp_password:");
  });

  it("compares admin edge secrets with timing-safe helpers", () => {
    const prospect = read("supabase/functions/create-prospect-account/index.ts");
    const magicLink = read("supabase/functions/demo-magic-link/index.ts");

    for (const source of [prospect, magicLink]) {
      expect(source).toContain("timingSafeEqual");
      expect(source).not.toContain("token !== ADMIN_SECRET");
    }
  });

  it("pins production GitHub Actions by immutable SHA", () => {
    const workflow = read(".github/workflows/deploy.yml");
    expect(workflow).toContain("actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5");
    expect(workflow).toContain("actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020");
    expect(workflow).not.toContain("actions/checkout@v4");
    expect(workflow).not.toContain("actions/setup-node@v4");
  });
});
