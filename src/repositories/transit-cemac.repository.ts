import { supabase } from "@/integrations/supabase/client";

export interface TransitCemac {
  id: string;
  fleet_id: string;
  vehicle_id: string;
  driver_id: string | null;
  departure_country: string;
  arrival_country: string;
  border_post: string | null;
  corridor: string | null;
  permit_ref: string | null;
  document_type: "trie" | "carnet_passage" | "manifeste" | "autre";
  departure_date: string;
  arrival_date: string | null;
  status: "en_route" | "arrive" | "retour" | "incident" | "annule";
  cargo_description: string | null;
  cargo_weight_kg: number | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type TransitCemacInsert = Omit<TransitCemac, "id" | "created_at" | "updated_at">;

export interface TransitCemacFilters {
  status?: TransitCemac["status"];
  vehicleId?: string;
  limit?: number;
}

const TABLE = "transits_cemac" as const;

export class TransitCemacRepository {
  async findByFleet(fleetId: string, filters: TransitCemacFilters = {}): Promise<TransitCemac[]> {
    let query = supabase
      .from(TABLE)
      .select("*")
      .eq("fleet_id", fleetId)
      .order("departure_date", { ascending: false });

    if (filters.status) {
      query = query.eq("status", filters.status);
    }
    if (filters.vehicleId) {
      query = query.eq("vehicle_id", filters.vehicleId);
    }
    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []) as TransitCemac[];
  }

  async findActive(fleetId: string): Promise<TransitCemac[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("fleet_id", fleetId)
      .eq("status", "en_route")
      .order("departure_date", { ascending: true });

    if (error) throw new Error(error.message);
    return (data ?? []) as TransitCemac[];
  }

  async create(payload: TransitCemacInsert): Promise<TransitCemac> {
    const { data, error } = await supabase
      .from(TABLE)
      .insert(payload)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as TransitCemac;
  }

  async updateStatus(
    id: string,
    status: TransitCemac["status"],
    arrivalDate?: string,
  ): Promise<void> {
    const patch: Partial<TransitCemac> = { status };
    if (arrivalDate) patch.arrival_date = arrivalDate;

    const { error } = await supabase.from(TABLE).update(patch).eq("id", id);
    if (error) throw new Error(error.message);
  }
}

export const transitCemacRepository = new TransitCemacRepository();
