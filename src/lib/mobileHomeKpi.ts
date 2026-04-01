import type { Vehicle } from "@/hooks/useVehicles";
import type { Alert } from "@/hooks/useAlerts";
import type { AppRole } from "@/hooks/useAuth";
import type { MaintenanceJob } from "@/hooks/useMaintenance";

/** Valeurs agrégées pour les cartes KPI de l’accueil mobile. */
export interface MobileHomeKpis {
  activeVehicles: number;
  immobilizedVehicles: number;
  criticalAlertsOpen: number;
  missionsInProgress: number;
}

function filterVehiclesForRole(
  vehicles: Vehicle[],
  role: AppRole | null,
  driverUserId: string | undefined
): Vehicle[] {
  if (role !== "driver" || !driverUserId) {
    return vehicles;
  }
  return vehicles.filter(
    (v) => v.active_assignment?.driver_user_id === driverUserId
  );
}

/** Compte les véhicules opérationnels (statut ok) et immobilisés (bloqués), avec filtre conducteur si besoin. */
export function computeVehicleKpis(
  vehicles: Vehicle[],
  role: AppRole | null,
  driverUserId: string | undefined
): Pick<MobileHomeKpis, "activeVehicles" | "immobilizedVehicles"> {
  const list = filterVehiclesForRole(vehicles, role, driverUserId);
  const activeVehicles = list.filter((v) => v.status === "ok").length;
  const immobilizedVehicles = list.filter((v) => v.status === "blocked").length;
  return { activeVehicles, immobilizedVehicles };
}

export function countCriticalUnresolvedAlerts(alerts: Alert[]): number {
  return alerts.filter((a) => a.severity === "critical").length;
}

/**
 * Compte les interventions planifiées sur la semaine courante,
 * en excluant les interventions déjà terminées.
 */
export function countMaintenanceDueThisWeek(
  jobs: MaintenanceJob[],
  referenceDate = new Date()
): number {
  const day = referenceDate.getUTCDay();
  const daysFromMonday = (day + 6) % 7;
  const weekStart = new Date(
    Date.UTC(
      referenceDate.getUTCFullYear(),
      referenceDate.getUTCMonth(),
      referenceDate.getUTCDate() - daysFromMonday,
      0,
      0,
      0,
      0
    )
  );
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 7);

  return jobs.filter((job) => {
    if (job.status === "ready") return false;
    if (!job.planned_at) return false;

    const plannedAt = new Date(job.planned_at);
    if (Number.isNaN(plannedAt.getTime())) return false;

    return plannedAt >= weekStart && plannedAt < weekEnd;
  }).length;
}
