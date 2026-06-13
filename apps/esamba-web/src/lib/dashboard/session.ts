import type { SupabaseClient } from "@supabase/supabase-js";

export interface FleetContext {
  userId: string;
  fleetId: string;
  orgId: string;
  role: string;
}

/** Résout la première adhésion flotte active + org_id (schéma français). */
export async function resolveFleetContext(
  supabase: SupabaseClient,
): Promise<FleetContext | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: membership } = await supabase
    .from("flotte_adhesions")
    .select("fleet_id, role, flottes(org_id)")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!membership?.fleet_id) return null;

  const fleetRow = membership.flottes;
  const fleet = Array.isArray(fleetRow) ? fleetRow[0] : fleetRow;
  if (!fleet?.org_id) return null;

  return {
    userId: user.id,
    fleetId: membership.fleet_id,
    orgId: fleet.org_id,
    role: membership.role,
  };
}
