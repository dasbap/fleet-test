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
  const maxVehicles = Math.max(0, toNum(o.max_vehicles)) || 999_999;
  const rawSlots = toNum(o.vehicle_slots);
  const vehicleSlots = rawSlots > 0 ? rawSlots : maxVehicles;

  return {
    planCode,
    planName: str(o.plan_name) ?? planNameFromCode(planCode),
    isPaid,
    // véhicules
    vehicleCount:   toNum(o.vehicle_count),
    activeVehicles: toNum(o.active_vehicles),
    vehicleSlots:   Math.max(1, vehicleSlots),
    maxVehicles,
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

const BILLING_STATUS_ALIASES: Record<string, BillingStatus> = {
  grace_period: "grace",
  pending_payment: "trial",
  expired: "suspended",
  cancelled: "suspended",
};

function toBillingStatus(v: unknown): BillingStatus {
  if (typeof v !== "string" || v.length === 0) return "trial";
  if (VALID_STATUSES.includes(v as BillingStatus)) return v as BillingStatus;
  return BILLING_STATUS_ALIASES[v] ?? "trial";
}

const PLAN_DISPLAY_NAMES: Record<string, string> = {
  free: "Gratuit",
  starter: "Starter",
  pro: "Pro",
  enterprise: "Enterprise",
  organizer: "Organizer",
};

function planNameFromCode(planCode: string): string {
  return PLAN_DISPLAY_NAMES[planCode] ?? planCode;
}
