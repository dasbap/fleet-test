import { supabase } from '@/integrations/supabase/client';

export interface AuditLogRow {
  id: string;
  actor_id: string | null;
  action: string;
  target_id: string | null;
  fleet_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

/**
 * Repository — journal d'audit flotte.
 */
export class AuditRepository {
  async findByFleet(
    fleetId: string,
    options?: { limit?: number; actions?: string[] },
  ): Promise<AuditLogRow[]> {
    let query = supabase
      .from('audit_logs')
      .select('id, actor_id, action, target_id, fleet_id, metadata, created_at')
      .eq('fleet_id', fleetId)
      .order('created_at', { ascending: false })
      .limit(options?.limit ?? 50);

    if (options?.actions?.length) {
      query = query.in('action', options.actions);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching fleet audit logs:', error);
      if (error.code === 'PGRST116' || error.code === 'PGRST205' || error.code === '42P01') {
        return [];
      }
      throw new Error(error.message);
    }

    return ((data as AuditLogRow[]) ?? []).map((row) => ({
      ...row,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
    }));
  }

  async write(
    action: string,
    fleetId: string,
    metadata: Record<string, unknown> = {},
    targetId?: string,
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.rpc('write_audit_log', {
      p_action: action,
      p_target_id: targetId ?? null,
      p_fleet_id: fleetId,
      p_metadata: metadata,
      p_actor_id: user?.id ?? null,
    });

    if (error) {
      console.error('Error writing audit log:', error);
      throw new Error(error.message);
    }
  }
}
