import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const subscriptionSlotsMigration = readFileSync(
  "supabase/migrations/20260810120000_subscription_vehicle_slots.sql",
  "utf8",
);
const paymentSyncMigration = readFileSync(
  "supabase/migrations/20260826080253_sync_pending_subscription_with_payment_status.sql",
  "utf8",
);
const driverAssignmentMigration = readFileSync(
  "supabase/migrations/20260825133500_require_active_vehicle_subscription_for_assignment.sql",
  "utf8",
);

describe("Cycle de vie critique véhicule / abonnement", () => {
  it("retire l'éligibilité véhicule quand un paiement pending échoue ou est annulé", () => {
    expect(paymentSyncMigration).toContain("ELSIF NEW.status IN ('failed', 'canceled') THEN");
    expect(paymentSyncMigration).toContain("SET status = 'cancelled'");
    expect(paymentSyncMigration).toContain("AND status = 'pending_payment'");
    expect(subscriptionSlotsMigration).toContain("select p_status in ('trial', 'active')");
  });

  it("termine réellement la période d'un abonnement arrêté avant échéance", () => {
    expect(subscriptionSlotsMigration).toContain(
      "create or replace function public.terminate_subscription_early",
    );
    expect(subscriptionSlotsMigration).toContain("set status = 'cancelled'");
    expect(subscriptionSlotsMigration).toContain("ends_at = least(ends_at, now())");
  });

  it("ne choisit automatiquement qu'un abonnement véhicule encore actif avec une place disponible", () => {
    expect(subscriptionSlotsMigration).toContain(
      "create or replace function public.find_available_subscription_for_vehicle",
    );
    expect(subscriptionSlotsMigration).toContain(
      "public.is_vehicle_subscription_status_active(a.status)",
    );
    expect(subscriptionSlotsMigration).toContain("where s.available_slots > 0");
  });

  it("refuse une nouvelle affectation conducteur si le droit véhicule ou l'abonnement est expiré", () => {
    expect(driverAssignmentMigration).toContain("dv.starts_at <= now()");
    expect(driverAssignmentMigration).toContain("dv.ends_at >= now()");
    expect(driverAssignmentMigration).toContain("a.status = 'active'");
    expect(driverAssignmentMigration).toContain("a.starts_at <= now()");
    expect(driverAssignmentMigration).toContain("a.ends_at >= now()");
    expect(driverAssignmentMigration).toContain(
      "RAISE EXCEPTION 'vehicule_sans_abonnement_actif'",
    );
  });
});
