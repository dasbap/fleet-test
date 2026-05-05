import { supabase } from "@/integrations/supabase/client";

export type InspectionType = "pre_trip" | "post_trip" | "weekly";
export type OverallStatus = "ok" | "minor_issues" | "unsafe";

export interface DvirEntry {
  id: string;
  fleet_id: string;
  vehicle_id: string;
  inspected_by: string;
  inspection_type: InspectionType;
  items: Record<string, boolean>;
  overall_status: OverallStatus;
  notes: string | null;
  odometer_km: number | null;
  inspected_at: string;
  created_at: string;
  vehicle?: { registration: string; brand: string | null; model: string | null } | null;
}

export interface DvirInsert {
  fleet_id: string;
  vehicle_id: string;
  inspected_by: string;
  inspection_type: InspectionType;
  items: Record<string, boolean>;
  overall_status: OverallStatus;
  notes?: string | null;
  odometer_km?: number | null;
}

export class DvirRepository {
  async create(entry: DvirInsert): Promise<DvirEntry> {
    const { data, error } = await supabase
      .from("controles_journaliers")
      .insert(entry)
      .select("*, vehicle:vehicules(registration, brand, model)")
      .single();

    if (error) throw new Error(error.message);
    return data as unknown as DvirEntry;
  }

  async findRecentByFleet(fleetId: string, limit = 30): Promise<DvirEntry[]> {
    const { data, error } = await supabase
      .from("controles_journaliers")
      .select("*, vehicle:vehicules(registration, brand, model)")
      .eq("fleet_id", fleetId)
      .order("inspected_at", { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as DvirEntry[];
  }

  async findById(id: string): Promise<DvirEntry | null> {
    const { data, error } = await supabase
      .from("controles_journaliers")
      .select("*, vehicle:vehicules(registration, brand, model)")
      .eq("id", id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data as unknown as DvirEntry | null;
  }

  async findTodayByVehicle(fleetId: string, vehicleId: string): Promise<DvirEntry[]> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from("controles_journaliers")
      .select("*")
      .eq("fleet_id", fleetId)
      .eq("vehicle_id", vehicleId)
      .gte("inspected_at", todayStart.toISOString())
      .order("inspected_at", { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as DvirEntry[];
  }
}
