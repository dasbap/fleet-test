import { z } from "zod";

export interface FleetOverview {
  active: number;
  idle: number;
  inMaintenance: number;
  immobilized: number;
  alerts: number;
  dataFreshness: string;
}

export interface VehicleHealth {
  vehicleId: string;
  plate?: string;
  model?: string;
  status: "active" | "idle" | "maintenance" | "immobilized";
  lastOdometerKm?: number;
  lastServiceDate?: string;
  nextServiceDueKm?: number;
  nextServiceDueDate?: string;
  fuelEfficiencyLPer100Km?: number;
  openAlerts?: Array<{ code: string; severity: "low" | "medium" | "high" | "critical"; message: string }>;
  riskScore: number;
  riskBand: "low" | "medium" | "high" | "critical";
  recommendations: string[];
}

export interface MaintenanceDueItem {
  vehicleId: string;
  plate?: string;
  dueType: "date" | "odometer" | "critical";
  dueDate?: string;
  dueKm?: number;
  delayDays?: number;
  priority: "low" | "medium" | "high" | "critical";
  action: string;
}

export interface FuelAnomaly {
  vehicleId: string;
  plate?: string;
  period: string;
  baselineLPer100Km: number;
  actualLPer100Km: number;
  deltaPercent: number;
  probableCauses: string[];
  estimatedMonthlyLeakage?: number;
}

export interface DecisionBrief {
  summary: string;
  priorities: Array<{
    title: string;
    severity: "low" | "medium" | "high" | "critical";
    businessImpact: string;
    recommendation: string;
  }>;
}

export interface DailyOpsSummary {
  date: string;
  availableVehicles: number;
  unavailableVehicles: number;
  criticalAlerts: number;
  delayedMaintenance: number;
  notes: string[];
}

const envSchema = z.object({
  ESAMBA_API_BASE_URL: z.string().url(),
  ESAMBA_API_TOKEN: z.string().min(1),
});

function getEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error("Configuration e-Samba invalide: ESAMBA_API_BASE_URL et ESAMBA_API_TOKEN sont requis.");
  }
  return parsed.data;
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const { ESAMBA_API_BASE_URL, ESAMBA_API_TOKEN } = getEnv();
  const response = await fetch(`${ESAMBA_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ESAMBA_API_TOKEN}`,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Erreur API e-Samba ${response.status}: ${body}`);
  }

  return response.json() as Promise<T>;
}

export function computeRiskBand(score: number): VehicleHealth["riskBand"] {
  if (score >= 85) return "critical";
  if (score >= 65) return "high";
  if (score >= 35) return "medium";
  return "low";
}

export async function getFleetOverview(date?: string): Promise<FleetOverview> {
  const q = date ? `?date=${encodeURIComponent(date)}` : "";
  return api<FleetOverview>(`/fleet/overview${q}`);
}

export async function getVehicleHealth(vehicleId: string): Promise<VehicleHealth> {
  const safeVehicleId = vehicleId.trim();
  if (!safeVehicleId) {
    throw new Error("L'identifiant véhicule est requis.");
  }

  const data = await api<Omit<VehicleHealth, "riskBand"> & { riskBand?: VehicleHealth["riskBand"] }>(
    `/vehicles/${encodeURIComponent(safeVehicleId)}`
  );

  return {
    ...data,
    riskBand: data.riskBand ?? computeRiskBand(data.riskScore),
  };
}

export async function getMaintenanceDue(windowDays = 7): Promise<MaintenanceDueItem[]> {
  const safeWindow = Math.max(1, Math.min(365, Math.floor(windowDays)));
  return api<MaintenanceDueItem[]>(`/maintenance/due?windowDays=${safeWindow}`);
}

export async function getFuelAnomalies(period = "30d", thresholdPercent = 15): Promise<FuelAnomaly[]> {
  const safeThreshold = Math.max(1, Math.min(100, Math.floor(thresholdPercent)));
  return api<FuelAnomaly[]>(
    `/analytics/fuel-anomalies?period=${encodeURIComponent(period)}&thresholdPercent=${safeThreshold}`
  );
}

export async function getDecisionBrief(scope = "weekly"): Promise<DecisionBrief> {
  return api<DecisionBrief>(`/analytics/decision-brief?scope=${encodeURIComponent(scope)}`);
}

export async function getDailyOpsSummary(date?: string): Promise<DailyOpsSummary> {
  const q = date ? `?date=${encodeURIComponent(date)}` : "";
  return api<DailyOpsSummary>(`/ops/daily-summary${q}`);
}
