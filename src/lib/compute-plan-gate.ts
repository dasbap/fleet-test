import type { PlanCode } from "@/types/auth";
import type { FleetBillingContext } from "@/types/fleet-billing";
import type { BillingSnapshot } from "@/services/billing.service";
import { toPlanCode } from "@/lib/fleet-billing-plan-enables";

/** Valeurs par défaut alignées sur `normalizeFleetBillingContext` / `buildAuthContext`. */
export const DEFAULT_FLEET_BILLING_CONTEXT: FleetBillingContext = {
  planCode: "free",
  isPaid: false,
  vehicleCount: 0,
  maxVehicles: 3,
  financeEnabled: false,
  aiEnabled: false,
  reportsEnabled: false,
  driverScoringEnabled: false,
  anomalyInsightsEnabled: false,
};

export interface PlanGateResult {
  planCode: PlanCode;
  plan_expired: boolean;
  plan_active: boolean;
}

/**
 * Dérive l’état d’accès « plan » (abonnements + contexte RPC flotte),
 * aligné sur `buildAuthContext` / `get_fleet_billing_context`.
 */
export function computePlanGate(
  fleetBilling: FleetBillingContext | null,
  billing: BillingSnapshot | null,
): PlanGateResult {
  const fb = fleetBilling ?? DEFAULT_FLEET_BILLING_CONTEXT;
  const planCode = toPlanCode(fb.planCode);
  const lapsed = Boolean(billing?.lapsedPaid);
  const hasActiveSubscription = Boolean(billing?.subscription);
  const plan_expired = lapsed;
  const plan_active =
    !plan_expired &&
    (planCode === "free" || fb.isPaid || hasActiveSubscription);

  return {
    planCode,
    plan_expired,
    plan_active,
  };
}
