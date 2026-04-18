import { supabase } from "@/integrations/supabase/client";

/**
 * Accès au contexte facturation / entitlements exposé par Supabase (RPC).
 */
export class FleetBillingRepository {
  async getFleetBillingContextRpc(fleetId: string): Promise<unknown> {
    const { data, error } = await supabase.rpc("get_fleet_billing_context", {
      p_fleet_id: fleetId,
    });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }
}
