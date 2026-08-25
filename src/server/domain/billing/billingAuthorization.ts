import type { SupabaseClient } from "@supabase/supabase-js";

export interface BillingFleetIntent {
  orgId: string;
  fleetId: string;
}

export async function assertCanManageBillingForFleet(
  supabase: SupabaseClient,
  intent: BillingFleetIntent,
): Promise<void> {
  const { data: fleet, error: fleetError } = await supabase
    .from("flottes")
    .select("id, org_id")
    .eq("id", intent.fleetId)
    .eq("org_id", intent.orgId)
    .maybeSingle<{ id: string; org_id: string }>();

  if (fleetError) throw new Error(fleetError.message);
  if (!fleet) {
    throw new Error("La flotte ne correspond pas a l'organisation indiquee.");
  }

  const { data: permission, error: permissionError } = await supabase.rpc("rbac_check_permission", {
    p_action: "billing.manage",
    p_fleet_id: intent.fleetId,
  });

  if (permissionError) throw new Error(permissionError.message);
  if (!permission || permission.allowed !== true) {
    throw new Error("Permission insuffisante pour gerer la facturation de cette flotte.");
  }
}
