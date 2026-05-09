import { supabase } from "@/integrations/supabase/client";

export interface FuelEntry {
  id: string;
  fleet_id: string;
  vehicle_id: string;
  driver_user_id: string;
  liters: number;
  amount_xof: number;
  odometer_km: number;
  purchased_at: string;
  station_name: string | null;
  receipt_ref: string | null;
  created_at: string;
  vehicle?: { registration: string; brand: string | null; model: string | null } | null;
  driver?: { full_name: string | null } | null;
}

export interface FuelEntryInsert {
  fleet_id: string;
  vehicle_id: string;
  driver_user_id: string;
  liters: number;
  amount_xof: number;
  odometer_km: number;
  purchased_at: string;
  station_name?: string | null;
  receipt_ref?: string | null;
  idempotency_key: string;
}

export class FuelRepository {
  async findByFleet(
    fleetId: string,
    options: { limit?: number; offset?: number } = {},
  ): Promise<FuelEntry[]> {
    const { data, error } = await supabase
      .from("journal_carburant")
      .select(
        "*, vehicle:vehicules(registration, brand, model), driver:profils(full_name)",
      )
      .eq("fleet_id", fleetId)
      .order("purchased_at", { ascending: false })
      .range(options.offset ?? 0, (options.offset ?? 0) + (options.limit ?? 50) - 1);

    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as FuelEntry[];
  }

  async create(entry: FuelEntryInsert): Promise<void> {
    const { error } = await supabase.rpc("enregistrer_carburant_offline", {
      p_fleet_id: entry.fleet_id,
      p_vehicle_id: entry.vehicle_id,
      p_driver_user_id: entry.driver_user_id,
      p_liters: entry.liters,
      p_amount_xof: entry.amount_xof,
      p_odometer_km: entry.odometer_km,
      p_purchased_at: entry.purchased_at,
      p_station_name: entry.station_name ?? null,
      p_receipt_ref: entry.receipt_ref ?? null,
      p_idempotency_key: entry.idempotency_key,
    });

    if (error) {
      console.error("Error creating fuel entry:", error);
      throw new Error(error.message);
    }
  }
}
