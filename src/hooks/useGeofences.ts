import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

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
    queryFn: async () => {
      if (!fid) return [] as Geofence[];
      const { data, error } = await supabase
        .from('geofences')
        .select('*')
        .eq('fleet_id', fid)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Geofence[];
    },
    enabled: !!fid,
  });
}

/** Derniers événements géofencing de la flotte (entrées + sorties). */
export function useGeofenceEvents(fleetId?: string, limit = 50) {
  const { userFleetId } = useAuth();
  const fid = fleetId ?? userFleetId;

  return useQuery({
    queryKey: ['geofence-events', fid, limit],
    queryFn: async () => {
      if (!fid) return [] as GeofenceEvent[];
      const { data, error } = await supabase
        .from('geofence_events')
        .select(`
          *,
          geofence:geofences(name),
          vehicle:vehicules(registration, label)
        `)
        .eq('fleet_id', fid)
        .order('occurred_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as GeofenceEvent[];
    },
    enabled: !!fid,
    refetchInterval: 30_000, // rafraîchissement toutes les 30 s
  });
}

/** Crée une nouvelle zone géographique. */
export function useCreateGeofence() {
  const { userFleetId } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateGeofenceInput) => {
      if (!userFleetId) throw new Error('Aucune flotte active');
      const { data, error } = await supabase
        .from('geofences')
        .insert({ ...input, fleet_id: userFleetId })
        .select()
        .single();
      if (error) throw error;
      return data as Geofence;
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
    mutationFn: async ({ id, ...patch }: UpdateGeofenceInput & { id: string }) => {
      const { data, error } = await supabase
        .from('geofences')
        .update(patch)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Geofence;
    },
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
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('geofences')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['geofences', userFleetId] });
    },
  });
}
