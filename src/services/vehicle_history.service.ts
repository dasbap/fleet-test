import { buildVehicleHistoryEvents, type VehicleHistoryEvent } from "@/features/fleet/lib/vehicleHistory";
import { VehicleHistoryRepository } from "@/repositories/vehicle_history.repository";

export interface VehicleHistoryResult {
  vehicleId: string;
  fleetId: string;
  events: VehicleHistoryEvent[];
}

export class VehicleHistoryService {
  constructor(private readonly repository: VehicleHistoryRepository) {}

  async getVehicleHistory(
    vehicleId: string,
    fleetId: string
  ): Promise<VehicleHistoryResult | null> {
    if (!vehicleId) {
      throw new Error("L'ID du véhicule est requis");
    }
    if (!fleetId) {
      throw new Error("L'ID de la flotte est requis");
    }

    const raw = await this.repository.findByVehicleAndFleet(vehicleId, fleetId);
    if (!raw) {
      return null;
    }

    return {
      vehicleId,
      fleetId,
      events: buildVehicleHistoryEvents(raw.vehicle, raw.alerts, raw.incidents, raw.maintenanceJobs),
    };
  }
}

