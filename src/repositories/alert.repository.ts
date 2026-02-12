import { supabase } from '@/integrations/supabase/client';

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface AlertRow {
  id: string;
  fleet_id: string;
  alert_type: 'missing_closure' | 'recurring_gap' | 'risky_driver' | 'vehicle_blocked';
  driver_user_id: string | null;
  vehicle_id: string | null;
  shift_id: string | null;
  severity: AlertSeverity;
  message: string;
  resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

export class AlertRepository {
  async findUnresolvedByFleet(fleetId: string): Promise<AlertRow[]> {
    const { data, error } = await supabase
      .from('alertes_automatiques')
      .select('*')
      .eq('fleet_id', fleetId)
      .eq('resolved', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching alerts:', error);
      throw new Error(error.message);
    }
    return (data || []) as AlertRow[];
  }

  async generateAlerts(fleetId: string): Promise<unknown> {
    const { data, error } = await supabase.rpc('generer_alertes_automatiques', {
      p_fleet_id: fleetId,
    });
    if (error) throw new Error(error.message);
    return data;
  }

  async resolve(alertId: string, resolvedBy: string): Promise<void> {
    const { error } = await supabase
      .from('alertes_automatiques')
      .update({
        resolved: true,
        resolved_by: resolvedBy,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', alertId);
    if (error) {
      console.error('Error resolving alert:', error);
      throw new Error(error.message);
    }
  }
}
