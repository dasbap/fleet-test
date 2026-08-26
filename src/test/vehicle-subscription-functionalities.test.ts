import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const subscriptionSlotsMigration = readFileSync(
  "supabase/migrations/20260810120000_subscription_vehicle_slots.sql",
  "utf8",
);
const createVehicleMigration = readFileSync(
  "supabase/migrations/20260825115003_pending_subscription_access_and_exclusive_activation.sql",
  "utf8",
);
const driverAssignmentMigration = readFileSync(
  "supabase/migrations/20260825133500_require_active_vehicle_subscription_for_assignment.sql",
  "utf8",
);
const multipleSubscriptionsMigration = readFileSync(
  "supabase/migrations/20260826080755_allow_multiple_active_subscriptions_per_fleet.sql",
  "utf8",
);

describe("Fonctionnalités véhicule protégées en base", () => {
  it("garantit qu'un véhicule n'a qu'un abonnement actif à la fois", () => {
    expect(subscriptionSlotsMigration).toContain(
      "create unique index if not exists droits_vehicules_one_active_subscription_per_vehicle",
    );
    expect(subscriptionSlotsMigration).toContain("on public.droits_vehicules(vehicle_id)");
    expect(subscriptionSlotsMigration).toContain("where active = true");
  });

  it("calcule les places disponibles par abonnement à partir des véhicules réellement associés", () => {
    expect(subscriptionSlotsMigration).toContain(
      "create or replace function public.get_subscription_available_slots",
    );
    expect(subscriptionSlotsMigration).toContain("where subscription_id = p_subscription_id");
    expect(subscriptionSlotsMigration).toContain("and active = true");
    expect(subscriptionSlotsMigration).toContain("return greatest(0, v_limit - v_used)");
  });

  it("refuse d'associer un véhicule à un abonnement d'une autre flotte", () => {
    expect(subscriptionSlotsMigration).toContain(
      "if v_sub.fleet_id is distinct from v_vehicle.fleet_id then",
    );
    expect(subscriptionSlotsMigration).toContain("raise exception 'abonnement_flotte_incompatible'");
  });

  it("refuse de dépasser la capacité propre à l'abonnement sélectionné", () => {
    expect(subscriptionSlotsMigration).toContain("if v_used >= v_limit then");
    expect(subscriptionSlotsMigration).toContain(
      "raise exception 'limite_vehicules_abonnement_atteinte'",
    );
  });

  it("permet de transférer un véhicule vers un autre abonnement de la même flotte", () => {
    expect(subscriptionSlotsMigration).toContain(
      "create or replace function public.transfer_vehicle_subscription",
    );
    expect(subscriptionSlotsMigration).toContain(
      "perform public.assign_vehicle_to_subscription(p_vehicle_id, p_target_subscription_id, auth.uid())",
    );
    expect(subscriptionSlotsMigration).toContain("'subscription.vehicle_transferred'");
  });

  it("désactive l'ancien droit avant d'attacher le véhicule à l'abonnement choisi", () => {
    expect(createVehicleMigration).toContain("UPDATE public.droits_vehicules");
    expect(createVehicleMigration).toContain("SET active = false, ended_at = now()");
    expect(createVehicleMigration).toContain(
      "PERFORM public.assign_vehicle_to_subscription(v_vehicle.id, p_subscription_id, auth.uid())",
    );
  });

  it("autorise plusieurs abonnements actifs indépendants pour une même flotte", () => {
    expect(multipleSubscriptionsMigration).toContain(
      "DROP INDEX IF EXISTS public.abonnements_one_active_per_fleet_idx",
    );
    expect(multipleSubscriptionsMigration).not.toContain(
      "AND id <> p_subscription_id\n     AND status = 'active'",
    );
  });

  it("crée un abonnement distinct pour chaque nouveau paiement véhicule", () => {
    expect(multipleSubscriptionsMigration).toContain(
      "WHERE a.payment_id = v_payment.id",
    );
    expect(multipleSubscriptionsMigration).not.toContain(
      "WHERE a.fleet_id = v_payment.fleet_id\n     AND a.status IN ('active', 'inactive', 'pending_payment', 'trial')",
    );
  });

  it("refuse l'affectation d'un conducteur si le véhicule n'a pas d'abonnement actif", () => {
    expect(driverAssignmentMigration).toContain("JOIN public.droits_vehicules dv");
    expect(driverAssignmentMigration).toContain("dv.active = true");
    expect(driverAssignmentMigration).toContain("a.status = 'active'");
    expect(driverAssignmentMigration).toContain("a.starts_at <= now()");
    expect(driverAssignmentMigration).toContain(
      "COALESCE(a.ends_at, 'infinity'::timestamptz) >= now()",
    );
    expect(driverAssignmentMigration).toContain(
      "RAISE EXCEPTION 'vehicule_sans_abonnement_actif'",
    );
  });

  it("la création explicite d'un véhicule exige un abonnement sélectionné", () => {
    expect(createVehicleMigration).toContain(
      "IF p_subscription_id IS NULL THEN RAISE EXCEPTION 'subscription_id_required'; END IF;",
    );
    expect(createVehicleMigration).toContain("IF v_target.fleet_id IS DISTINCT FROM p_fleet_id");
    expect(createVehicleMigration).toContain("RAISE EXCEPTION 'abonnement_flotte_incompatible'");
  });
});
