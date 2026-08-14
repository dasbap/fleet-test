/**
 * Tests d'intégration billing E-Samba — Supabase live.
 *
 * Prérequis :
 *   RUN_SUPABASE_INTEGRATION=1
 *   VITE_SUPABASE_URL=https://...supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=...
 *
 * Exécution locale :
 *   RUN_SUPABASE_INTEGRATION=1 npx vitest run src/test/integration/billing.integration.test.ts
 *
 * CI (GitHub Actions) :
 *   Voir .github/workflows/integration.yml — secrets passés via env:
 *     RUN_SUPABASE_INTEGRATION: "1"
 *     VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
 *     SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
 *
 * Ces tests sont SKIPPÉS si RUN_SUPABASE_INTEGRATION != "1".
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  makeAdminClient,
  seedTenant,
  seedVehicles,
  seedTrialSubscription,
  seedActivePaidSubscription,
  seedExpiredSubscription,
  seedQrToken,
  cleanupTenant,
  getActiveSubscription,
  canFleetCreateVehicle,
  getPlanAccess,
  type TestTenant,
} from "@/test/helpers/billing-test-helpers";
import type { SupabaseClient } from "@supabase/supabase-js";

// ─── Guard global ────────────────────────────────────────────────────────────

const RUN = process.env.RUN_SUPABASE_INTEGRATION === "1";

if (RUN) {
  const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url)
    throw new Error("VITE_SUPABASE_URL requis pour RUN_SUPABASE_INTEGRATION=1");
  if (!key)
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY requis pour RUN_SUPABASE_INTEGRATION=1"
    );
}

// ─── Suite principale ────────────────────────────────────────────────────────

describe("Billing integration — Supabase live", () => {
  let admin: SupabaseClient;
  // Tenant réutilisé dans toute la suite
  let tenant: TestTenant;
  // Tag unique pour isoler les données de ce run
  const tag = `biling-${Date.now()}`;

  beforeAll(async () => {
    admin = makeAdminClient();
    // Cree org + flotte; les vehicules sont ajoutes apres l'ouverture des slots.
    tenant = await seedTenant(admin, tag, 0);
  });

  afterAll(async () => {
    if (tenant) {
      await cleanupTenant(admin, tenant.orgId);
    }
  });

  // ── 1. Création abonnement trial ─────────────────────────────────────────

  describe("1 — Création abonnement trial", () => {
    let trialSubId: string;

    it("billing_start_trial retourne un UUID", async () => {
      trialSubId = await seedTrialSubscription(admin, tenant.fleetId, 30);
      expect(trialSubId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
    });

    it("l'abonnement trial est lisible et a le bon statut", async () => {
      const sub = await getActiveSubscription(admin, tenant.fleetId);
      expect(sub).not.toBeNull();
      expect(sub!.status).toBe("trial");
    });

    it("billing_start_trial est idempotent — même ID au 2e appel", async () => {
      const secondId = await seedTrialSubscription(admin, tenant.fleetId, 30);
      expect(secondId).toBe(trialSubId);
    });

    it("billing_events contient un event subscription.activated", async () => {
      const { data } = await admin
        .from("billing_events")
        .select("event_type")
        .eq("fleet_id", tenant.fleetId)
        .eq("event_type", "subscription.activated")
        .limit(1);
      expect(data?.length).toBeGreaterThan(0);
    });

    it("cree le vehicule apres ouverture du slot trial", async () => {
      tenant.vehicleIds = await seedVehicles(admin, tenant.fleetId, tag, 1);
      expect(tenant.vehicleIds).toHaveLength(1);
    });
  });

  // ── 2. Limite Free : 3 véhicules max ────────────────────────────────────

  describe("2 — Limite Free (3 véhicules)", () => {
    it("can_create_vehicle retourne FALSE quand flotte est à la limite", async () => {
      // Le tenant a deja 1 vehicule + 1 abonnement trial Free (1 slot).
      const allowed = await canFleetCreateVehicle(admin, tenant.fleetId);
      expect(allowed).toBe(false);
    });

    it("get_plan_access.can_add_vehicle = false", async () => {
      const access = await getPlanAccess(admin, tenant.fleetId);
      expect(access.can_add_vehicle).toBe(false);
    });

    it("get_plan_access.ai_enabled = false sur Free", async () => {
      const access = await getPlanAccess(admin, tenant.fleetId);
      expect(access.ai_enabled).toBe(false);
    });
  });

  // ── 3. Paiement successful → activation abonnement ──────────────────────

  describe("3 — Paiement successful active l'abonnement", () => {
    let paymentId: string;
    let subscriptionId: string;

    beforeAll(async () => {
      // Annuler le trial pour permettre l'activation
      await admin
        .from("abonnements")
        .update({ status: "cancelled" })
        .eq("fleet_id", tenant.fleetId)
        .eq("status", "trial");

      const result = await seedActivePaidSubscription(admin, tenant, {
        planCode: "starter",
        vehicleCount: 3,
        durationMonths: 1,
      });
      paymentId = result.paymentId;
      subscriptionId = result.subscriptionId;
    });

    it("l'abonnement Starter est actif", async () => {
      const sub = await getActiveSubscription(admin, tenant.fleetId);
      expect(sub).not.toBeNull();
      expect(sub!.status).toBe("active");
      expect(sub!.plan_code).toBe("starter");
    });

    it("le paiement a le statut successful", async () => {
      const { data } = await admin
        .from("paiements")
        .select("status")
        .eq("id", paymentId)
        .single();
      expect(data?.status).toBe("successful");
    });

    it("ends_at est dans le futur", async () => {
      const sub = await getActiveSubscription(admin, tenant.fleetId);
      expect(new Date(sub!.ends_at).getTime()).toBeGreaterThan(Date.now());
    });

    it("billing_event payment.successful est journalisé", async () => {
      const { data } = await admin
        .from("billing_events")
        .select("event_type, payload")
        .eq("fleet_id", tenant.fleetId)
        .in("event_type", ["payment.successful", "subscription.activated"])
        .limit(5);
      expect(data?.length).toBeGreaterThan(0);
    });
  });

  // ── 4. Webhook idempotent ────────────────────────────────────────────────

  describe("4 — Idempotence webhook Notch Pay", () => {
    const providerRef = `NOTCH-IDEM-${Date.now()}`;

    beforeAll(async () => {
      // Créer un paiement avec une référence connue
      const { data: pay } = await admin
        .from("paiements")
        .insert({
          org_id: tenant.orgId,
          provider: "notch",
          provider_reference: providerRef,
          amount: 15000,
          currency: "XAF",
          status: "processing",
          idempotency_key: `idem-test-${providerRef}`,
          raw_payload: {
            planCode: "starter",
            vehicleCount: 1,
            durationMonths: 1,
            fleetId: tenant.fleetId,
          },
        })
        .select("id")
        .single();

      // Simuler un premier traitement webhook (insert payment_attempt)
      if (pay?.id) {
        await admin.from("payment_attempts").insert({
          payment_id: pay.id,
          provider: "notch",
          provider_reference: providerRef,
          status: "successful",
          raw_payload: {},
          raw_response: {},
        });
      }
    });

    it("le doublon payment_attempt est rejeté par contrainte UNIQUE", async () => {
      // Récupérer l'ID du paiement créé
      const { data: pay } = await admin
        .from("paiements")
        .select("id")
        .eq("provider_reference", providerRef)
        .single();

      expect(pay).not.toBeNull();

      const { error } = await admin.from("payment_attempts").insert({
        payment_id: pay!.id,
        provider: "notch",
        provider_reference: providerRef,
        status: "successful",
        raw_payload: {},
        raw_response: {},
      });

      // Doit échouer avec code 23505 (unique_violation)
      expect(error).not.toBeNull();
      expect(error!.code).toBe("23505");
    });

    it("le paiement existant via provider_reference est retrouvé (lookup idempotence)", async () => {
      const { data } = await admin
        .from("paiements")
        .select("id, status")
        .eq("provider_reference", providerRef)
        .maybeSingle();
      expect(data).not.toBeNull();
    });
  });

  // ── 5 & 6. Jetons QR : valide et expiré ─────────────────────────────────

  describe("5 & 6 — QR : valide et expiré", () => {
    const vehicleId = () => tenant.vehicleIds[0];

    it("5 — jeton QR valide est actif et dans le futur", async () => {
      const { tokenId, token } = await seedQrToken(admin, vehicleId(), {
        expiresInDays: 90,
      });

      const { data } = await admin
        .from("jetons_qr")
        .select("status, expires_at")
        .eq("id", tokenId)
        .single();

      expect(data!.status).toBe("active");
      expect(new Date(data!.expires_at).getTime()).toBeGreaterThan(Date.now());

      // Nettoyage
      await admin.from("jetons_qr").delete().eq("id", tokenId);
    });

    it("6 — jeton QR expiré : expires_at dans le passé", async () => {
      const { tokenId } = await seedQrToken(admin, vehicleId(), {
        expired: true,
      });

      const { data } = await admin
        .from("jetons_qr")
        .select("status, expires_at")
        .eq("id", tokenId)
        .single();

      expect(new Date(data!.expires_at).getTime()).toBeLessThan(Date.now());

      // Un QR expiré ne doit PAS être considéré valide
      const isValid =
        data!.status === "active" && new Date(data!.expires_at) > new Date();
      expect(isValid).toBe(false);

      await admin.from("jetons_qr").delete().eq("id", tokenId);
    });
  });

  // ── 7. Abonnement expiré → grace_period ──────────────────────────────────

  describe("7 — Abonnement expiré → grace_period via lifecycle cron", () => {
    let expiredTenant: TestTenant;
    let subId: string;

    beforeAll(async () => {
      expiredTenant = await seedTenant(admin, `${tag}-gc`, 0);
      subId = await seedExpiredSubscription(admin, expiredTenant, "starter");
    });

    afterAll(async () => {
      await cleanupTenant(admin, expiredTenant.orgId);
    });

    it("billing_run_daily_lifecycle passe l'abonnement expiré en grace_period", async () => {
      const { data, error } = await admin.rpc("billing_run_daily_lifecycle");
      expect(error).toBeNull();
      expect(data).toHaveProperty("transitioned_to_grace");
    });

    it("le statut de l'abonnement est maintenant grace_period", async () => {
      const { data } = await admin
        .from("abonnements")
        .select("status, grace_until")
        .eq("id", subId)
        .single();

      expect(data!.status).toBe("grace_period");
      expect(data!.grace_until).not.toBeNull();
      expect(new Date(data!.grace_until).getTime()).toBeGreaterThan(Date.now());
    });

    it("billing_event subscription.grace_period_started est présent", async () => {
      const { data } = await admin
        .from("billing_events")
        .select("event_type")
        .eq("fleet_id", expiredTenant.fleetId)
        .eq("event_type", "subscription.grace_period_started")
        .limit(1);
      expect(data?.length).toBeGreaterThan(0);
    });
  });

  // ── 8. grace_period → suspended ──────────────────────────────────────────

  describe("8 — grace_period expirée → suspended", () => {
    let suspendTenant: TestTenant;
    let subId: string;

    beforeAll(async () => {
      suspendTenant = await seedTenant(admin, `${tag}-sp`, 0);

      // Créer un plan + abonnement déjà en grace_period expirée
      const { data: plan } = await admin
        .from("plans")
        .select("id")
        .eq("code", "starter")
        .single();

      const pastEnds = new Date(Date.now() - 10 * 86400_000);
      const pastGrace = new Date(Date.now() - 2 * 86400_000); // grace expiré il y a 2j

      const { data: sub } = await admin
        .from("abonnements")
        .insert({
          fleet_id: suspendTenant.fleetId,
          plan_id: plan!.id,
          starts_at: new Date(
            pastEnds.getTime() - 30 * 86400_000
          ).toISOString(),
          ends_at: pastEnds.toISOString(),
          grace_until: pastGrace.toISOString(),
          status: "grace_period",
        })
        .select("id")
        .single();
      subId = sub!.id;
    });

    afterAll(async () => {
      await cleanupTenant(admin, suspendTenant.orgId);
    });

    it("billing_run_daily_lifecycle suspend la grace_period expirée", async () => {
      const { data, error } = await admin.rpc("billing_run_daily_lifecycle");
      expect(error).toBeNull();
      expect(
        (data as { transitioned_to_suspended: number })
          .transitioned_to_suspended
      ).toBeGreaterThan(0);
    });

    it("le statut est maintenant suspended", async () => {
      const { data } = await admin
        .from("abonnements")
        .select("status")
        .eq("id", subId)
        .single();
      expect(data!.status).toBe("suspended");
    });

    it("billing_event subscription.suspended journalisé", async () => {
      const { data } = await admin
        .from("billing_events")
        .select("event_type")
        .eq("fleet_id", suspendTenant.fleetId)
        .eq("event_type", "subscription.suspended")
        .limit(1);
      expect(data?.length).toBeGreaterThan(0);
    });
  });

  // ── 9. Plan Pro → Pulse accessible ──────────────────────────────────────

  describe("9 — Plan Pro donne accès à Pulse+", () => {
    let proTenant: TestTenant;

    beforeAll(async () => {
      proTenant = await seedTenant(admin, `${tag}-pro`, 0);
      await seedActivePaidSubscription(admin, proTenant, { planCode: "pro" });
      proTenant.vehicleIds = await seedVehicles(
        admin,
        proTenant.fleetId,
        `${tag}-pro`,
        2
      );
    });

    afterAll(async () => {
      await cleanupTenant(admin, proTenant.orgId);
    });

    it("get_plan_access.ai_enabled = true sur Pro", async () => {
      const access = await getPlanAccess(admin, proTenant.fleetId);
      expect(access.ai_enabled).toBe(true);
    });

    it("get_plan_access.reports_enabled = true sur Pro", async () => {
      const access = await getPlanAccess(admin, proTenant.fleetId);
      expect(access.reports_enabled).toBe(true);
    });

    it("get_plan_access.finance_enabled = true sur Pro", async () => {
      const access = await getPlanAccess(admin, proTenant.fleetId);
      expect(access.finance_enabled).toBe(true);
    });
  });

  // ── 10. Plan Free → Pulse bloqué ────────────────────────────────────────

  describe("10 — Plan Free bloque Pulse+", () => {
    let freeTenant: TestTenant;

    beforeAll(async () => {
      freeTenant = await seedTenant(admin, `${tag}-free`, 0);
      await seedTrialSubscription(admin, freeTenant.fleetId, 30);
      freeTenant.vehicleIds = await seedVehicles(
        admin,
        freeTenant.fleetId,
        `${tag}-free`,
        1
      );
    });

    afterAll(async () => {
      await cleanupTenant(admin, freeTenant.orgId);
    });

    it("get_plan_access.ai_enabled = false sur Free/Trial", async () => {
      const access = await getPlanAccess(admin, freeTenant.fleetId);
      expect(access.ai_enabled).toBe(false);
    });

    it("get_plan_access.reports_enabled = false sur Free/Trial", async () => {
      const access = await getPlanAccess(admin, freeTenant.fleetId);
      expect(access.reports_enabled).toBe(false);
    });

    it("can_create_vehicle = false avec 1 vehicule sur le seul slot Free", async () => {
      const allowed = await canFleetCreateVehicle(admin, freeTenant.fleetId);
      expect(allowed).toBe(false);
    });
  });
});
