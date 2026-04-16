import { VehicleRepository } from "@/repositories/vehicle.repository";
import {
  getRecentVehicles,
  getVehicleListPlaceholder,
} from "@/lib/storage/flotteEsambaLocalCache";

export interface ScanVehicleRecord {
  id: string;
  fleet_id: string;
  registration: string;
}

export class ScanRepository {
  constructor(private readonly vehicleRepository: VehicleRepository) {}

  private fromCacheByVehicleId(vehicleId: string, fleetId: string): ScanVehicleRecord | null {
    const recent = getRecentVehicles().find(
      (entry) => entry.vehicleId === vehicleId && entry.fleetId === fleetId,
    );
    if (recent) {
      return {
        id: recent.vehicleId,
        fleet_id: recent.fleetId,
        registration: recent.registration,
      };
    }

    const snapshot = getVehicleListPlaceholder({ fleet_id: fleetId, search: undefined, status: undefined });
    const row = snapshot?.find((entry) => entry.id === vehicleId);
    if (!row) return null;
    return {
      id: row.id,
      fleet_id: row.fleet_id,
      registration: row.registration,
    };
  }

  private fromCacheByRegistration(registration: string, fleetId: string): ScanVehicleRecord | null {
    const normalized = registration.trim().toUpperCase();
    const recent = getRecentVehicles().find(
      (entry) => entry.fleetId === fleetId && entry.registration.toUpperCase() === normalized,
    );
    if (recent) {
      return {
        id: recent.vehicleId,
        fleet_id: recent.fleetId,
        registration: recent.registration,
      };
    }

    const snapshot = getVehicleListPlaceholder({ fleet_id: fleetId, search: undefined, status: undefined });
    const row = snapshot?.find((entry) => entry.registration.toUpperCase() === normalized);
    if (!row) return null;
    return {
      id: row.id,
      fleet_id: row.fleet_id,
      registration: row.registration,
    };
  }

  async findVehicleById(vehicleId: string, fleetId: string): Promise<ScanVehicleRecord | null> {
    try {
      const row = await this.vehicleRepository.findById(vehicleId);
      if (row && row.fleet_id === fleetId) {
        return { id: row.id, fleet_id: row.fleet_id, registration: row.registration };
      }
    } catch {
      // Fallback offline silencieux
    }
    return this.fromCacheByVehicleId(vehicleId, fleetId);
  }

  async findVehicleByRegistration(registration: string, fleetId: string): Promise<ScanVehicleRecord | null> {
    try {
      const row = await this.vehicleRepository.findByRegistration(registration, fleetId);
      if (row) {
        return { id: row.id, fleet_id: row.fleet_id, registration: row.registration };
      }
    } catch {
      // Fallback offline silencieux
    }
    return this.fromCacheByRegistration(registration, fleetId);
  }
}

