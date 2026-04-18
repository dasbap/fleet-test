import { supabase } from "@/integrations/supabase/client";
import type { Geofence, GeofenceEvent, GpsTrackerDevice, VehiclePositionLatest } from "@/types/gps";

export class FleetTrackingRepository {
  async findLatestPositionsByFleet(fleetId: string): Promise<VehiclePositionLatest[]> {
    const { data, error } = await supabase
      .from("vehicle_positions_latest")
      .select("*")
      .eq("fleet_id", fleetId)
      .order("tracker_time", { ascending: false });

    if (error) {
      console.error("Error fetching latest vehicle positions:", error);
      throw new Error(error.message);
    }

    return (data ?? []) as VehiclePositionLatest[];
  }

  async findGeofencesByFleet(fleetId: string): Promise<Geofence[]> {
    const { data, error } = await supabase
      .from("geofences")
      .select("*")
      .eq("fleet_id", fleetId)
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching geofences:", error);
      throw new Error(error.message);
    }

    return (data ?? []) as Geofence[];
  }

  async findRecentGeofenceEventsByFleet(fleetId: string, limit = 30): Promise<GeofenceEvent[]> {
    const { data, error } = await supabase
      .from("geofence_events")
      .select("*")
      .eq("fleet_id", fleetId)
      .order("occurred_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching geofence events:", error);
      throw new Error(error.message);
    }

    return (data ?? []) as GeofenceEvent[];
  }

  async findGpsDevicesByFleet(fleetId: string): Promise<GpsTrackerDevice[]> {
    const { data, error } = await supabase
      .from("gps_devices")
      .select("*")
      .eq("fleet_id", fleetId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching GPS devices:", error);
      throw new Error(error.message);
    }

    return (data ?? []) as GpsTrackerDevice[];
  }
}
