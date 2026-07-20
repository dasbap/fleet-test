import { supabase } from "@/integrations/supabase/client";
import { throwIfSupabaseInfrastructureError } from "@/lib/supabase-runtime-errors";

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
  /** Agrégat carburant 90j (dashboard, sans charger N lignes). */
  async findFleetSummaryAggregated(fleetId: string): Promise<{
    totalLiters: number;
    totalAmountXof: number;
    entryCount: number;
  }> {
    const since = new Date();
    since.setDate(since.getDate() - 90);
    const { data, error } = await supabase
      .from("journal_carburant")
      .select("liters, amount_xof")
      .eq("fleet_id", fleetId)
      .gte("purchased_at", since.toISOString());
    if (error) {
      throwIfSupabaseInfrastructureError(error, "fuel summary");
      throw new Error(error.message);
    }
    const rows = data ?? [];
    return {
      totalLiters: rows.reduce((s, r) => s + Number(r.liters ?? 0), 0),
      totalAmountXof: rows.reduce((s, r) => s + Number(r.amount_xof ?? 0), 0),
      entryCount: rows.length,
    };
  }

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

    if (error) {
      throwIfSupabaseInfrastructureError(error, "fuel entries");
      throw new Error(error.message);
    }
    return (data ?? []) as unknown as FuelEntry[];
  }

  /** Pleins d'un véhicule (page détail flotte). */
  async findByVehicle(fleetId: string, vehicleId: string, limit = 100): Promise<FuelEntry[]> {
    const { data, error } = await supabase
      .from("journal_carburant")
      .select("id, vehicle_id, purchased_at, amount_xof, liters, odometer_km")
      .eq("fleet_id", fleetId)
      .eq("vehicle_id", vehicleId)
      .order("purchased_at", { ascending: false })
      .limit(limit);
    if (error) {
      throwIfSupabaseInfrastructureError(error, "vehicle fuel entries");
      throw new Error(error.message);
    }
    return (data ?? []) as FuelEntry[];
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
      throwIfSupabaseInfrastructureError(error, "fuel entry create");
      console.error("Error creating fuel entry:", error);
      throw new Error(error.message);
    }
  }
}
