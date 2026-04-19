import type { PlanCode, PlanEnables } from "@/types/auth";
import type { FleetBillingContext } from "@/types/fleet-billing";

/** Seuil RPC `get_fleet_billing_context` : plafond véhicules « illimité ». */
export const UNLIMITED_VEHICLES_THRESHOLD = 999_999;

/**
 * Convertit le contexte facturation normalisé en flags produit `PlanEnables`.
 */
export function fleetBillingToPlanEnables(ctx: FleetBillingContext): PlanEnables {
  return {
    finance: ctx.financeEnabled,
    ai: ctx.aiEnabled,
    reports: ctx.reportsEnabled,
    driver_scoring: ctx.driverScoringEnabled,
    anomaly_insights: ctx.anomalyInsightsEnabled,
  };
}

/**
 * `null` = illimité (aligné backend : `max_vehicles` ≥ seuil).
 */
export function fleetBillingMaxVehiclesOrNull(
  maxVehicles: number,
): number | null {
  if (maxVehicles >= UNLIMITED_VEHICLES_THRESHOLD) {
    return null;
  }
  return maxVehicles;
}

/** Valide / retombe sur `free` si code inconnu. */
export function toPlanCode(code: string): PlanCode {
  if (
    code === "free" ||
    code === "starter" ||
    code === "pro" ||
    code === "organizer"
  ) {
    return code;
  }
  return "free";
}
