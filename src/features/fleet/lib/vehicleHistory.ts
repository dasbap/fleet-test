import type { VehicleDto } from "@/types/dto/vehicle.dto";
import type { AlertDto } from "@/types/dto/alert.dto";
import type { Incident } from "@/repositories/incident.repository";
import type { MaintenanceJob, Priority } from "@/repositories/maintenance.repository";

export interface FuelCostEntry {
  purchased_at: string;
  amount_xof: number;
}

export interface VehicleHistoryEvent {
  id: string;
  at: string;
  title: string;
  description?: string;
}

/**
 * Historique unifié du véhicule.
 * Les flux missions/entretiens réels seront branchés ici dès disponibilité.
 */
export function buildVehicleHistoryEvents(
  vehicle: VehicleDto,
  alerts: AlertDto[],
  incidents: Incident[] = [],
  maintenanceJobs: MaintenanceJob[] = [],
): VehicleHistoryEvent[] {
  const events: VehicleHistoryEvent[] = [];

  if (vehicle.created_at) {
    events.push({
      id: `vehicle-created-${vehicle.id}`,
      at: vehicle.created_at,
      title: "Véhicule ajouté à la flotte",
      description: `${vehicle.registration} (${vehicle.brand ?? "Marque"} ${vehicle.model ?? "modèle"})`,
    });
  }

  if (vehicle.status === "blocked" && vehicle.blocked_reason) {
    events.push({
      id: `vehicle-blocked-${vehicle.id}`,
      at: vehicle.created_at,
      title: "Véhicule bloqué",
      description: vehicle.blocked_reason,
    });
  }

  for (const alert of alerts) {
    events.push({
      id: `alert-${alert.id}`,
      at: alert.created_at,
      title: "Alerte opérationnelle",
      description: alert.message,
    });
  }

  for (const incident of incidents) {
    events.push({
      id: `incident-${incident.id}`,
      at: incident.created_at,
      title: "Incident déclaré",
      description: incident.description,
    });
  }

  for (const job of maintenanceJobs) {
    events.push({
      id: `maintenance-${job.id}`,
      at: job.created_at,
      title: "Intervention maintenance",
      description: job.notes ?? `Statut: ${job.status}`,
    });
  }

  return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

// —— Vue détail véhicule (KPI, timeline) ——————————————————————————

/** Statistiques affichées sur la fiche (coût réservé pour extension schéma). */
export interface VehicleDetailStats {
  totalCostXaf12m: number;
  avgCostPerMonth: number;
  completedCount: number;
  pendingCount: number;
  criticalAlerts: number;
}

/** Entrée minimale pour calcul coûts (évite dépendance directe vers fuel.repository) */
export interface FuelCostEntry {
  purchased_at: string;
  amount_xof: number;
}

/** Gravité visuelle pour la timeline (couleurs). */
export type TimelineSeverity = "info" | "warning" | "critical";

export function isMaintenanceJobDone(job: MaintenanceJob): boolean {
  return job.status === "ready";
}

export function getJobScheduledIso(job: MaintenanceJob): string {
  return job.planned_at ?? job.created_at;
}

export function getJobDisplayDateIso(job: MaintenanceJob): string {
  if (isMaintenanceJobDone(job)) {
    return job.closed_at ?? job.created_at;
  }
  return getJobScheduledIso(job);
}

/**
 * Jours jusqu'à la date cible (positif = futur, négatif = retard).
 * `nowMs` injectable pour les tests.
 */
export function daysUntil(iso: string, nowMs: number = Date.now()): number {
  return Math.ceil((new Date(iso).getTime() - nowMs) / 86_400_000);
}

export function countCriticalAlerts(alerts: AlertDto[]): number {
  return alerts.filter((a) => a.severity === "critical").length;
}

export function buildVehicleDetailStats(
  jobs: MaintenanceJob[],
  alerts: AlertDto[],
  fuelEntries: FuelCostEntry[] = [],
): VehicleDetailStats {
  const completedCount = jobs.filter(isMaintenanceJobDone).length;
  const pendingCount = jobs.filter((j) => !isMaintenanceJobDone(j)).length;
  const criticalAlerts = countCriticalAlerts(alerts);
  const twelveMonthsAgo = Date.now() - 12 * 30 * 24 * 60 * 60 * 1000;
  const recentFuel = fuelEntries.filter(
    (e) => new Date(e.purchased_at).getTime() >= twelveMonthsAgo,
  );
  const totalCostXaf12m = recentFuel.reduce((s, e) => s + e.amount_xof, 0);
  const avgCostPerMonth = Math.round(totalCostXaf12m / 12);
  return { totalCostXaf12m, avgCostPerMonth, completedCount, pendingCount, criticalAlerts };
}

/** Prochaine intervention non terminée (échéance la plus proche). */
export function pickNextPendingMaintenance(jobs: MaintenanceJob[]): MaintenanceJob | null {
  const pending = jobs.filter((j) => !isMaintenanceJobDone(j));
  if (pending.length === 0) return null;
  pending.sort((a, b) => {
    const ta = new Date(getJobScheduledIso(a)).getTime();
    const tb = new Date(getJobScheduledIso(b)).getTime();
    return ta - tb;
  });
  return pending[0] ?? null;
}

/** Ordre antichronologique pour l'historique. */
export function sortJobsForTimeline(jobs: MaintenanceJob[]): MaintenanceJob[] {
  return [...jobs].sort((a, b) => {
    const da = new Date(getJobDisplayDateIso(a)).getTime();
    const db = new Date(getJobDisplayDateIso(b)).getTime();
    return db - da;
  });
}

const PRIORITY_LABEL: Record<Priority, string> = {
  low: "Priorité faible",
  medium: "Priorité moyenne",
  high: "Priorité élevée",
  critical: "Priorité critique",
};

export function maintenancePriorityLabel(priority: Priority): string {
  return PRIORITY_LABEL[priority] ?? priority;
}

/** Libellé court pour badge (liste / timeline). */
export function maintenanceShortLabel(job: MaintenanceJob): string {
  const firstNote = job.notes?.trim().split("\n")[0]?.trim();
  if (firstNote) return firstNote.length > 42 ? firstNote.slice(0, 42) + "…" : firstNote;
  const map: Record<Priority, string> = {
    low: "Entretien mineur",
    medium: "Entretien standard",
    high: "Entretien prioritaire",
    critical: "Intervention critique",
  };
  return map[job.priority] ?? "Intervention";
}

/**
 * Sévérité visuelle : priorité + retard pour les jobs non terminés.
 */
export function timelineSeverityForJob(job: MaintenanceJob, nowMs: number = Date.now()): TimelineSeverity {
  if (isMaintenanceJobDone(job)) {
    return "info";
  }
  const d = daysUntil(getJobScheduledIso(job), nowMs);
  if (d < 0) {
    if (job.priority === "critical" || job.priority === "high") return "critical";
    return d < -30 ? "critical" : "warning";
  }
  if (job.priority === "critical" || job.priority === "high") return "warning";
  return "info";
}

/** Urgence pour la carte « Prochain entretien » (KPI). */
export function nextMaintenanceUrgency(
  job: MaintenanceJob | null,
  nowMs: number = Date.now()
): "info" | "warning" | "critical" {
  if (!job) return "info";
  const d = daysUntil(getJobScheduledIso(job), nowMs);
  if (d < 0) return "critical";
  if (d < 7) return "warning";
  return "info";
}

export function vehicleStatusUi(vehicle: VehicleDto): {
  label: string;
  variant: "ok" | "blocked";
} {
  if (vehicle.status === "blocked") {
    return { label: "Bloqué", variant: "blocked" };
  }
  return { label: "Actif", variant: "ok" };
}
