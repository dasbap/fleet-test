import { FleetTrackingRepository } from "@/repositories/fleet-tracking.repository";
import type { Geofence, GeofenceEvent, GpsTrackerDevice, VehiclePositionLatest } from "@/types/gps";

export class FleetTrackingService {
  constructor(private repository: FleetTrackingRepository) {}

  async getLatestPositionsByFleet(fleetId?: string): Promise<VehiclePositionLatest[]> {
    if (!fleetId) {
      return [];
    }
    return this.repository.findLatestPositionsByFleet(fleetId);
  }

  async getGeofencesByFleet(fleetId?: string): Promise<Geofence[]> {
    if (!fleetId) {
      return [];
    }
    return this.repository.findGeofencesByFleet(fleetId);
  }

  async getRecentGeofenceEventsByFleet(
    fleetId?: string,
    limit = 30,
  ): Promise<GeofenceEvent[]> {
    if (!fleetId) {
      return [];
    }
    const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 100) : 30;
    return this.repository.findRecentGeofenceEventsByFleet(fleetId, safeLimit);
  }

  async getGpsDevicesByFleet(fleetId?: string): Promise<GpsTrackerDevice[]> {
    if (!fleetId) {
      return [];
    }
    return this.repository.findGpsDevicesByFleet(fleetId);
  }
}
