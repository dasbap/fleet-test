import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { GeofenceService } from '@/services/geofence.service';
import { GeofenceRepository } from '@/repositories/geofence.repository';
import { refetchIntervalWhenVisible } from '@/lib/query/refetchPolicy';

const geofenceRepository = new GeofenceRepository();
const geofenceService = new GeofenceService(geofenceRepository);

// ─── Types ────────────────────────────────────────────────────────────────────

export type GeofenceType = 'circle' | 'polygon';

export interface Geofence {
  id: string;
  fleet_id: string;
  name: string;
  geofence_type: GeofenceType;
  center_lat: number | null;
  center_lng: number | null;
  radius_m: number | null;
  polygon_geojson: GeoJSON.Polygon | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GeofenceEvent {
  id: string;
  fleet_id: string;
  vehicle_id: string;
  geofence_id: string;
  event_type: 'enter' | 'exit';
  occurred_at: string;
  latitude: number;
  longitude: number;
  tracker_imei: string | null;
  geofence?: { name: string };
  vehicle?: { registration: string; label: string | null };
}

export interface CreateGeofenceInput {
  name: string;
  geofence_type: GeofenceType;
  center_lat?: number;
  center_lng?: number;
  radius_m?: number;
  polygon_geojson?: GeoJSON.Polygon;
}

export interface UpdateGeofenceInput extends Partial<CreateGeofenceInput> {
  is_active?: boolean;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** Liste toutes les zones actives de la flotte. */
export function useGeofences(fleetId?: string) {
  const { userFleetId } = useAuth();
  const fid = fleetId ?? userFleetId;

  return useQuery({
    queryKey: ['geofences', fid],
    queryFn: () => (fid ? geofenceService.getGeofences(fid) : []),
    enabled: !!fid,
    staleTime: 120_000,
    refetchInterval: () => refetchIntervalWhenVisible(120_000),
  });
}

/** Derniers événements géofencing de la flotte (entrées + sorties). */
export function useGeofenceEvents(fleetId?: string, limit = 50) {
  const { userFleetId } = useAuth();
  const fid = fleetId ?? userFleetId;

  return useQuery({
    queryKey: ['geofence-events', fid, limit],
    queryFn: () => (fid ? geofenceService.getRecentEvents(fid, limit) : []),
    enabled: !!fid,
    staleTime: 60_000,
    refetchInterval: () => refetchIntervalWhenVisible(120_000),
  });
}

/** Crée une nouvelle zone géographique. */
export function useCreateGeofence() {
  const { userFleetId } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateGeofenceInput) => {
      if (!userFleetId) throw new Error('Aucune flotte active');
      return geofenceService.createGeofence(userFleetId, input);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['geofences', userFleetId] });
    },
  });
}

/** Met à jour une zone (nom, géométrie, statut actif). */
export function useUpdateGeofence() {
  const { userFleetId } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...patch }: UpdateGeofenceInput & { id: string }) =>
      geofenceService.updateGeofence(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['geofences', userFleetId] });
    },
  });
}

/** Supprime (désactive) une zone. */
export function useDeleteGeofence() {
  const { userFleetId } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => geofenceService.updateGeofence(id, { is_active: false }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['geofences', userFleetId] });
    },
  });
}
