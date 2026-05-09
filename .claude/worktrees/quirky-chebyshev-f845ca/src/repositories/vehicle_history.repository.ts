import { AlertRepository } from "@/repositories/alert.repository";
import { IncidentRepository } from "@/repositories/incident.repository";
import { MaintenanceRepository } from "@/repositories/maintenance.repository";
import { VehicleRepository } from "@/repositories/vehicle.repository";
import type { AlertDto } from "@/types/dto/alert.dto";
import type { VehicleDto } from "@/types/dto/vehicle.dto";
import type { Incident } from "@/repositories/incident.repository";
import type { MaintenanceJob } from "@/repositories/maintenance.repository";

export interface VehicleHistoryRawData {
  vehicle: VehicleDto;
  alerts: AlertDto[];
  incidents: Incident[];
  maintenanceJobs: MaintenanceJob[];
}

export class VehicleHistoryRepository {
  constructor(
    private readonly vehicleRepository: VehicleRepository,
    private readonly alertRepository: AlertRepository,
    private readonly incidentRepository: IncidentRepository,
    private readonly maintenanceRepository: MaintenanceRepository
  ) {}

  async findByVehicleAndFleet(
    vehicleId: string,
    fleetId: string
  ): Promise<VehicleHistoryRawData | null> {
    const vehicle = await this.vehicleRepository.findById(vehicleId);
    if (!vehicle || vehicle.fleet_id !== fleetId) {
      return null;
    }

    const [alerts, incidents, maintenanceJobs] = await Promise.all([
      this.alertRepository.findUnresolvedByVehicle(vehicleId, fleetId),
      this.incidentRepository.findAll({ vehicle_id: vehicleId, fleet_id: fleetId, limit: 50 }),
      this.maintenanceRepository.findAll({ vehicle_id: vehicleId, fleet_id: fleetId, limit: 50 }),
    ]);

    return {
      vehicle,
      alerts,
      incidents,
      maintenanceJobs,
    };
  }
}

