import type { BillingStatus, FleetBillingContext } from "@/types/fleet-billing";

const EMPTY: FleetBillingContext = {
  planCode: "free",
  planName: "Gratuit",
  isPaid: false,
  vehicleCount: 0,
  activeVehicles: 0,
  vehicleSlots: 3,
  maxVehicles: 3,
  billingStatus: "trial",
  trialEndsAt: null,
  subscriptionEndsAt: null,
  graceUntil: null,
  financeEnabled: false,
  aiEnabled: false,
  reportsEnabled: false,
  driverScoringEnabled: false,
  anomalyInsightsEnabled: false,
  geofencingEnabled: false,
  scheduledReportsEnabled: false,
  offlineDriverEnabled: false,
};

/**
 * Normalise la réponse JSON de `get_fleet_billing_context` (snake_case Postgres → camelCase).
 */
export function normalizeFleetBillingContext(raw: unknown): FleetBillingContext {
  if (!raw || typeof raw !== "object") return { ...EMPTY };
  const o = raw as Record<string, unknown>;

  const planCode = str(o.plan_code) ?? EMPTY.planCode;
  const isPaid = Boolean(o.is_paid);

  return {
    planCode,
    planName: str(o.plan_name) ?? EMPTY.planName,
    isPaid,
    // véhicules
    vehicleCount:   toNum(o.vehicle_count),
    activeVehicles: toNum(o.active_vehicles),
    vehicleSlots:   Math.max(1, toNum(o.vehicle_slots)),
    maxVehicles:    Math.max(0, toNum(o.max_vehicles)) || 999_999,
    // facturation
    billingStatus:     toBillingStatus(o.billing_status),
    trialEndsAt:       str(o.trial_ends_at),
    subscriptionEndsAt:str(o.subscription_ends_at),
    graceUntil:        str(o.grace_until),
    // features
    financeEnabled:          resolveFlag(o.finance_enabled, planCode),
    aiEnabled:               resolveFlag(o.ai_enabled, planCode),
    reportsEnabled:          resolveFlag(o.reports_enabled, planCode),
    driverScoringEnabled:    resolveFlag(o.driver_scoring_enabled, planCode),
    anomalyInsightsEnabled:  resolveFlag(o.anomaly_insights_enabled, planCode),
    geofencingEnabled:       Boolean(o.geofencing_enabled),
    scheduledReportsEnabled: Boolean(o.scheduled_reports_enabled),
    offlineDriverEnabled:    Boolean(o.offline_driver_enabled),
  };
}

/** Helpers ---------------------------------------------------------------- */

function resolveFlag(value: unknown, planCode: string): boolean {
  if (value !== undefined) return Boolean(value);
  return planCode !== "free";
}

function toNum(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

const VALID_STATUSES: BillingStatus[] = ["trial", "active", "grace", "suspended", "enterprise"];
function toBillingStatus(v: unknown): BillingStatus {
  return VALID_STATUSES.includes(v as BillingStatus) ? (v as BillingStatus) : "trial";
}
