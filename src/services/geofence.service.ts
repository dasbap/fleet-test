import { GeofenceRepository } from "@/repositories/geofence.repository";
import type {
  CreateGeofenceInput,
  Geofence,
  GeofenceEvent,
  UpdateGeofenceInput,
} from "@/hooks/useGeofences";

export class GeofenceService {
  constructor(private repository: GeofenceRepository) {}

  getGeofences(fleetId: string): Promise<Geofence[]> {
    if (!fleetId) throw new Error("L'ID de la flotte est requis");
    return this.repository.findByFleet(fleetId);
  }

  getRecentEvents(fleetId: string, limit = 50): Promise<GeofenceEvent[]> {
    if (!fleetId) return Promise.resolve([]);
    return this.repository.findRecentEvents(fleetId, limit);
  }

  createGeofence(fleetId: string, input: CreateGeofenceInput): Promise<Geofence> {
    if (!input.name?.trim()) throw new Error("Le nom de la zone est requis");
    return this.repository.create(fleetId, input);
  }

  updateGeofence(id: string, input: UpdateGeofenceInput): Promise<Geofence> {
    return this.repository.update(id, input);
  }

  deleteGeofence(id: string): Promise<void> {
    return this.repository.delete(id);
  }
}
