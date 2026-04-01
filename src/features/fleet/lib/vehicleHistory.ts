import type { VehicleDto } from "@/types/dto/vehicle.dto";
import type { AlertDto } from "@/types/dto/alert.dto";

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

  return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

