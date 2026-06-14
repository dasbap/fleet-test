import { supabase } from "@/integrations/supabase/client";

export interface ProspectStatusRpcResult {
  ok: boolean;
  error?: string;
  status?: string;
  trial_start?: string;
  trial_end?: string;
  fleet_id?: string;
  days_remaining?: number;
  is_expired?: boolean;
}

/**
 * Accès RPC statut prospect (prospect_get_status).
 */
export class ProspectDemoRepository {
  async getStatus(): Promise<ProspectStatusRpcResult> {
    const { data, error } = await supabase.rpc("prospect_get_status");

    if (error) {
      console.error("Erreur prospect_get_status:", error);
      throw error;
    }

    return (data ?? { ok: false }) as ProspectStatusRpcResult;
  }
}
