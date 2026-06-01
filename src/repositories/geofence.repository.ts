import { supabase } from "@/integrations/supabase/client";
import type {
  CreateGeofenceInput,
  Geofence,
  GeofenceEvent,
  UpdateGeofenceInput,
} from "@/hooks/useGeofences";

export class GeofenceRepository {
  async findByFleet(fleetId: string): Promise<Geofence[]> {
    const { data, error } = await supabase
      .from("geofences")
      .select("*")
      .eq("fleet_id", fleetId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Geofence[];
  }

  async findRecentEvents(fleetId: string, limit: number): Promise<GeofenceEvent[]> {
    const { data, error } = await supabase
      .from("geofence_events")
      .select(
        "*, geofence:geofences(name), vehicle:vehicules(registration, label)",
      )
      .eq("fleet_id", fleetId)
      .order("occurred_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return (data ?? []) as GeofenceEvent[];
  }

  async create(fleetId: string, input: CreateGeofenceInput): Promise<Geofence> {
    const { data, error } = await supabase
      .from("geofences")
      .insert({ fleet_id: fleetId, ...input })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as Geofence;
  }

  async update(id: string, input: UpdateGeofenceInput): Promise<Geofence> {
    const { data, error } = await supabase
      .from("geofences")
      .update(input)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as Geofence;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from("geofences").delete().eq("id", id);
    if (error) throw new Error(error.message);
  }
}
