import { supabase } from "@/integrations/supabase/client";

export interface DriverTerrainSelfCheckResult {
  phone: string | null;
  hasEverShift: boolean;
}

/**
 * Accès RPC auto-vérification conducteur terrain.
 */
export class DriverTerrainRepository {
  async selfCheck(userId: string, fleetId: string): Promise<DriverTerrainSelfCheckResult> {
    const { data, error } = await supabase.rpc("driver_terrain_self_check", {
      p_user_id: userId,
      p_fleet_id: fleetId,
    });

    if (error) {
      console.error("Erreur driver_terrain_self_check:", error);
      throw new Error(error.message);
    }

    const result = data as { phone: string | null; has_ever_shift: boolean } | null;
    return {
      phone: result?.phone ?? null,
      hasEverShift: result?.has_ever_shift ?? false,
    };
  }
}
