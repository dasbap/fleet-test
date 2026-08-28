import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const subscriptionSlotsMigration = readFileSync(
  "supabase/migrations/20260810120000_subscription_vehicle_slots.sql",
  "utf8",
);
const multiSubscriptionMigration = readFileSync(
  "supabase/migrations/20260826080755_allow_multiple_active_subscriptions_per_fleet.sql",
  "utf8",
);

describe("Types d'abonnement et capacité véhicule", () => {
  it("limite un abonnement standard/starter à un véhicule par défaut", () => {
    expect(subscriptionSlotsMigration).toContain("else 1");
    expect(subscriptionSlotsMigration).toContain(
      "when p_plan_code in ('pro', 'enterprise') then true",
    );
    expect(subscriptionSlotsMigration).toContain(
      "raise exception 'abonnement_standard_deja_utilise'",
    );
  });

  it("permet à un abonnement Pro d'utiliser plusieurs véhicules jusqu'à sa capacité", () => {
    expect(subscriptionSlotsMigration).toContain("when code = 'pro' then coalesce(max_vehicles, 100)");
    expect(subscriptionSlotsMigration).toContain("when p_plan_code = 'pro' then coalesce(p_plan_max, 100)");
    expect(subscriptionSlotsMigration).toContain("if v_used >= v_limit then");
    expect(subscriptionSlotsMigration).toContain(
      "raise exception 'limite_vehicules_abonnement_atteinte'",
    );
  });

  it("traite Enterprise comme un abonnement multi-véhicules sans limite pratique par défaut", () => {
    expect(subscriptionSlotsMigration).toContain("when code = 'enterprise' then null");
    expect(subscriptionSlotsMigration).toContain("when p_plan_code = 'enterprise' then 999999");
    expect(subscriptionSlotsMigration).toContain(
      "when p_plan_code in ('pro', 'enterprise') then true",
    );
  });

  it("n'autorise les véhicules que sur des abonnements trial ou active", () => {
    expect(subscriptionSlotsMigration).toContain(
      "select p_status in ('trial', 'active')",
    );
    expect(subscriptionSlotsMigration).toContain(
      "raise exception 'abonnement_inactif'",
    );
  });

  it("autorise plusieurs abonnements actifs indépendants du même type dans une flotte", () => {
    expect(multiSubscriptionMigration).toContain(
      "DROP INDEX IF EXISTS public.abonnements_one_active_per_fleet_idx",
    );
    expect(multiSubscriptionMigration).not.toContain(
      "AND id <> p_subscription_id\n     AND status = 'active'",
    );
  });

  it("protège la compatibilité des modèles de capacité actifs dans une même flotte", () => {
    expect(subscriptionSlotsMigration).toContain(
      "create or replace function public.trg_enforce_same_active_subscription_plan",
    );
    expect(subscriptionSlotsMigration).toContain(
      "public.subscription_vehicle_capacity_model",
    );
    expect(subscriptionSlotsMigration).toContain(
      "raise exception 'abonnement_type_incompatible'",
    );
  });
});

describe("Passage d'un véhicule d'un abonnement à un autre", () => {
  it("exige que l'abonnement cible appartienne à la même flotte", () => {
    expect(subscriptionSlotsMigration).toContain(
      "if v_target.fleet_id is distinct from v_vehicle.fleet_id then",
    );
    expect(subscriptionSlotsMigration).toContain(
      "raise exception 'abonnement_flotte_incompatible'",
    );
  });

  it("exige la permission billing.manage pour effectuer un transfert", () => {
    expect(subscriptionSlotsMigration).toContain(
      "v_check := public.rbac_check_permission('billing.manage', v_target.fleet_id)",
    );
    expect(subscriptionSlotsMigration).toContain(
      "raise exception 'permission_refusee_abonnement'",
    );
  });

  it("considère un transfert vers le même abonnement comme idempotent", () => {
    expect(subscriptionSlotsMigration).toContain(
      "if v_old_subscription_id = p_target_subscription_id then",
    );
    expect(subscriptionSlotsMigration).toContain(
      "'subscription_id', p_target_subscription_id",
    );
  });

  it("désactive l'ancien droit avant d'associer le véhicule au nouvel abonnement", () => {
    expect(subscriptionSlotsMigration).toContain(
      "update public.droits_vehicules\n  set active = false,\n      ended_at = now()",
    );
    expect(subscriptionSlotsMigration).toContain(
      "perform public.assign_vehicle_to_subscription(p_vehicle_id, p_target_subscription_id, auth.uid())",
    );
  });

  it("refuse un transfert vers un abonnement inactif", () => {
    expect(subscriptionSlotsMigration).toContain(
      "if not public.is_vehicle_subscription_status_active(v_sub.status) then",
    );
    expect(subscriptionSlotsMigration).toContain(
      "raise exception 'abonnement_inactif'",
    );
  });

  it("refuse un transfert vers un abonnement dont les slots sont pleins", () => {
    expect(subscriptionSlotsMigration).toContain("if v_used >= v_limit then");
    expect(subscriptionSlotsMigration).toContain(
      "raise exception 'limite_vehicules_abonnement_atteinte'",
    );
  });

  it("garantit qu'un véhicule ne reste actif que sur un seul abonnement", () => {
    expect(subscriptionSlotsMigration).toContain(
      "create unique index if not exists droits_vehicules_one_active_subscription_per_vehicle",
    );
    expect(subscriptionSlotsMigration).toContain("on public.droits_vehicules(vehicle_id)");
    expect(subscriptionSlotsMigration).toContain("where active = true");
  });

  it("journalise le transfert avec l'ancien et le nouvel abonnement", () => {
    expect(subscriptionSlotsMigration).toContain("'subscription.vehicle_transferred'");
    expect(subscriptionSlotsMigration).toContain("'from_subscription_id', v_old_subscription_id");
    expect(subscriptionSlotsMigration).toContain("'to_subscription_id', p_target_subscription_id");
  });
});
