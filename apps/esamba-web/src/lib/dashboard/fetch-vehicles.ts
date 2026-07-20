import type { SupabaseClient } from "@supabase/supabase-js";
import type { FleetContext } from "@/lib/dashboard/session";

export interface VehicleFilters {
  status?: string;
  fleet?: string;
  q?: string;
}

export interface FleetOption {
  id: string;
  name: string;
}

export interface VehicleRow {
  id: string;
  registration: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  current_km: number;
  status: string;
  created_at: string;
  fleet_id: string;
  fleet_name: string;
  driver_name: string | null;
}

function normalizeStatusFilter(status?: string): string | undefined {
  if (!status) return undefined;
  if (status === "active") return "ok";
  if (status === "inactive" || status === "maintenance") return "blocked";
  return status;
}

function fleetNameFromJoin(
  row: { id: string; name: string } | { id: string; name: string }[] | null | undefined,
): string {
  if (!row) return "—";
  if (Array.isArray(row)) return row[0]?.name ?? "—";
  return row.name;
}

export async function fetchVehiclesPageData(
  supabase: SupabaseClient,
  context: FleetContext,
  filters: VehicleFilters,
) {
  const { data: fleets } = await supabase
    .from("flottes")
    .select("id, name")
    .eq("org_id", context.orgId)
    .order("name");

  const fleetOptions = (fleets ?? []) as FleetOption[];
  const fleetIds = fleetOptions.map((f) => f.id);

  if (fleetIds.length === 0) {
    return {
      vehicles: [] as VehicleRow[],
      fleets: fleetOptions,
      statusCounts: {} as Record<string, number>,
    };
  }

  const scopedFleetIds =
    filters.fleet && fleetIds.includes(filters.fleet)
      ? [filters.fleet]
      : fleetIds;

  let query = supabase
    .from("vehicules")
    .select(
      "id, registration, brand, model, year, current_km, status, created_at, fleet_id, flottes(id, name)",
    )
    .in("fleet_id", scopedFleetIds)
    .order("created_at", { ascending: false });

  const statusFilter = normalizeStatusFilter(filters.status);
  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  if (filters.q?.trim()) {
    query = query.ilike("registration", `%${filters.q.trim()}%`);
  }

  const { data: rawVehicles, error } = await query;
  const vehicleIds = (rawVehicles ?? []).map((v) => v.id);

  const driverByVehicle = new Map<string, string>();
  if (vehicleIds.length > 0) {
    const { data: assignments } = await supabase
      .from("affectations_vehicules")
      .select("vehicle_id, profils(full_name)")
      .in("vehicle_id", vehicleIds)
      .eq("is_active", true)
      .is("ends_at", null);

    for (const row of assignments ?? []) {
      const profil = row.profils as
        | { full_name?: string | null }
        | { full_name?: string | null }[]
        | null;
      const name = Array.isArray(profil)
        ? profil[0]?.full_name
        : profil?.full_name;
      if (name && !driverByVehicle.has(row.vehicle_id)) {
        driverByVehicle.set(row.vehicle_id, name);
      }
    }
  }

  const vehicles: VehicleRow[] = (error ? [] : (rawVehicles ?? [])).map(
    (row) => ({
      id: row.id,
      registration: row.registration,
      brand: row.brand,
      model: row.model,
      year: row.year,
      current_km: row.current_km,
      status: row.status,
      created_at: row.created_at,
      fleet_id: row.fleet_id,
      fleet_name: fleetNameFromJoin(
        row.flottes as { id: string; name: string } | { id: string; name: string }[],
      ),
      driver_name: driverByVehicle.get(row.id) ?? null,
    }),
  );

  const { data: allStatuses } = await supabase
    .from("vehicules")
    .select("status")
    .in("fleet_id", fleetIds);

  const statusCounts = (allStatuses ?? []).reduce<Record<string, number>>(
    (acc, row) => {
      acc[row.status] = (acc[row.status] ?? 0) + 1;
      return acc;
    },
    {},
  );

  return { vehicles, fleets: fleetOptions, statusCounts };
}
