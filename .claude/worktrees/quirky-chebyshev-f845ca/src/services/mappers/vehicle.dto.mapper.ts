import type { Vehicle, VehicleOperationalStatus } from "@/types/vehicle";
import type { VehicleDto } from "@/types/dto/vehicle.dto";

/** Mappe le statut DTO vers le statut domaine (maintenance absent côté DTO → ok). */
function mapStatusDtoToDomain(status: VehicleDto["status"]): VehicleOperationalStatus {
  if (status === "blocked") return "blocked";
  return "ok";
}

/**
 * Transforme un véhicule persistance → modèle domaine Flotte E-Samba.
 * Les champs absents en base sont complétés par des valeurs par défaut.
 */
export function mapVehicleDtoToDomain(dto: VehicleDto): Vehicle {
  const created = dto.created_at;
  return {
    id: dto.id,
    fleetId: dto.fleet_id,
    registration: dto.registration,
    label: null,
    brand: dto.brand,
    model: dto.model,
    currentKm: dto.current_km,
    status: mapStatusDtoToDomain(dto.status),
    blockedReason: dto.blocked_reason,
    createdAt: created,
    updatedAt: created,
  };
}
