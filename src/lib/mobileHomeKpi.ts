import { endOfWeek, isWithinInterval, parseISO, startOfWeek } from "date-fns";
import type { MaintenanceJob } from "@/hooks/useMaintenance";
import type { Vehicle } from "@/hooks/useVehicles";
import type { Alert } from "@/hooks/useAlerts";
import type { AppRole } from "@/hooks/useAuth";

/** Valeurs agrégées pour les cartes KPI de l’accueil mobile. */
export interface MobileHomeKpis {
  activeVehicles: number;
  immobilizedVehicles: number;
  maintenanceDueThisWeek: number;
  criticalAlertsOpen: number;
  missionsInProgress: number;
}

/** Interventions non terminées dont la date planifiée (ou la création) tombe dans la semaine civile courante (lundi → dimanche). */
export function countMaintenanceDueThisWeek(
  jobs: MaintenanceJob[],
  now: Date = new Date()
): number {
  const start = startOfWeek(now, { weekStartsOn: 1 });
  const end = endOfWeek(now, { weekStartsOn: 1 });
  const range = { start, end };

  return jobs.filter((j) => {
    if (j.status === "ready") return false;
    const ref = j.planned_at ?? j.created_at;
    if (!ref) return false;
    try {
      const d = parseISO(ref);
      return isWithinInterval(d, range);
    } catch {
      return false;
    }
  }).length;
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
