import type { FleetBillingContext } from "@/types/fleet-billing";

const EMPTY: FleetBillingContext = {
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

/**
 * Normalise la réponse JSON de `get_fleet_billing_context` (snake_case Postgres).
 */
export function normalizeFleetBillingContext(raw: unknown): FleetBillingContext {
  if (!raw || typeof raw !== "object") {
    return { ...EMPTY };
  }
  const o = raw as Record<string, unknown>;
  const planCode = typeof o.plan_code === "string" ? o.plan_code : EMPTY.planCode;
  const isPaid = Boolean(o.is_paid);
  return {
    planCode,
    isPaid,
    vehicleCount: toNum(o.vehicle_count),
    maxVehicles: Math.max(0, toNum(o.max_vehicles)),
    financeEnabled: Boolean(o.finance_enabled),
    aiEnabled: Boolean(o.ai_enabled),
    reportsEnabled: resolveCapabilityFlag(o.reports_enabled, planCode),
    driverScoringEnabled: resolveCapabilityFlag(o.driver_scoring_enabled, planCode),
    anomalyInsightsEnabled: resolveCapabilityFlag(o.anomaly_insights_enabled, planCode),
  };
}

/**
 * Si la clé est absente (RPC avant migration des colonnes `plans`) :
 * - plan `free` → fonctionnalité fermée (aligné produit, évite le déploiement front sans migration)
 * - autre plan → ouvert (équivalent offre payante complète pour les clés non encore renvoyées)
 */
function resolveCapabilityFlag(value: unknown, planCode: string): boolean {
  if (value !== undefined) {
    return Boolean(value);
  }
  return planCode !== "free";
}

function toNum(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) {
    return v;
  }
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}
