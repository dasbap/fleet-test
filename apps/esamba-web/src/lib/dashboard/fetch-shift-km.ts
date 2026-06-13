import type { SupabaseClient } from "@supabase/supabase-js";

export interface ShiftKmRow {
  km_start: number;
  km_end: number | null;
  ended_at: string | null;
}

/** Km des créneaux clôturés — requête avec alias, repli si filtre imbriqué échoue. */
export async function fetchShiftKmRows(
  supabase: SupabaseClient,
  fleetId: string,
  sinceIso: string,
): Promise<ShiftKmRow[]> {
  const primary = await supabase
    .from("creneaux_conducteurs")
    .select(
      `
      km_start,
      km_end,
      ended_at,
      assignment:affectations_vehicules!inner(fleet_id)
    `,
    )
    .eq("status", "closed")
    .eq("assignment.fleet_id", fleetId)
    .gte("ended_at", sinceIso);

  if (!primary.error && primary.data) {
    return primary.data as ShiftKmRow[];
  }

  const { data: assignments } = await supabase
    .from("affectations_vehicules")
    .select("id")
    .eq("fleet_id", fleetId);

  const assignmentIds = (assignments ?? []).map((row) => row.id);
  if (assignmentIds.length === 0) {
    return [];
  }

  const fallback = await supabase
    .from("creneaux_conducteurs")
    .select("km_start, km_end, ended_at, assignment_id")
    .eq("status", "closed")
    .in("assignment_id", assignmentIds)
    .gte("ended_at", sinceIso);

  if (fallback.error || !fallback.data) {
    return [];
  }

  return fallback.data as ShiftKmRow[];
}
