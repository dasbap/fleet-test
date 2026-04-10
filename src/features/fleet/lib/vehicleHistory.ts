import type { VehicleDto } from "@/types/dto/vehicle.dto";
import type { AlertDto } from "@/types/dto/alert.dto";
import type { Incident } from "@/repositories/incident.repository";
import type { MaintenanceJob } from "@/repositories/maintenance.repository";

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

