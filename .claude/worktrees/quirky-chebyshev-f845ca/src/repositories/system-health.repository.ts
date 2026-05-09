import { supabase } from '@/integrations/supabase/client';

export interface HealthRpcResult {
  ok?: boolean;
  error?: string;
  orphan_count?: number;
  orphan_users?: Array<{ user_id: string; email: string; created_at: string }>;
}

export interface RpcError extends Error {
  code?: string;
}

export class SystemHealthRepository {
  async checkHealthRpc(fleetId: string): Promise<{ data: HealthRpcResult | null; error: RpcError | null }> {
    const { data, error } = await supabase.rpc('verifier_sante_systeme', {
      p_fleet_id: fleetId,
    });
    return {
      data: data as HealthRpcResult | null,
      error: error as RpcError | null,
    };
  }

  async repairOrphanRpc(userId: string, fleetId: string): Promise<{ error: RpcError | null }> {
    const { error } = await supabase.rpc('reparer_adhesion_orpheline', {
      p_user_id: userId,
      p_fleet_id: fleetId,
      p_role: 'driver',
    });
    return { error: error as RpcError | null };
  }
}
