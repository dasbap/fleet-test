import { supabase } from '@/integrations/supabase/client';
import type {
  AlertDto,
  IncidentWorkflowStatusDto,
  OperationalAlertSeverityDto,
  OperationalAlertTypeDto,
} from '@/types/dto/alert.dto';

export interface AlertListQueryFilters {
  fleetId: string;
  severity?: OperationalAlertSeverityDto;
  type?: OperationalAlertTypeDto;
  resolved?: boolean;
}

/** @deprecated Utiliser `AlertDto`. */
export type AlertRow = AlertDto;

export class AlertRepository {
  async findUnresolvedByFleet(fleetId: string): Promise<AlertDto[]> {
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
    return (data || []) as AlertDto[];
  }

  async findByFleetWithFilters(filters: AlertListQueryFilters): Promise<AlertDto[]> {
    const { fleetId, severity, type, resolved } = filters;

    let query = supabase
      .from("alertes_automatiques")
      .select("*")
      .eq("fleet_id", fleetId)
      .order("created_at", { ascending: false });

    if (resolved !== undefined) {
      query = query.eq("resolved", resolved);
    }

    if (severity) {
      query = query.eq("severity", severity);
    }

    if (type) {
      query = query.eq("alert_type", type);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching filtered alerts:", error);
      throw new Error(error.message);
    }

    return (data || []) as AlertDto[];
  }

  async findUnresolvedByVehicle(
    vehicleId: string,
    fleetId?: string,
  ): Promise<AlertDto[]> {
    let query = supabase
      .from("alertes_automatiques")
      .select("*")
      .eq("vehicle_id", vehicleId)
      .eq("resolved", false)
      .order("created_at", { ascending: false });

    if (fleetId) {
      query = query.eq("fleet_id", fleetId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching vehicle alerts:", error);
      throw new Error(error.message);
    }

    return (data || []) as AlertDto[];
  }

  async findById(id: string): Promise<AlertDto | null> {
    const { data, error } = await supabase
      .from('alertes_automatiques')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching alert:', error);
      throw new Error(error.message);
    }
    return (data ?? null) as AlertDto | null;
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

  async updateStatus(alertId: string, status: IncidentWorkflowStatusDto): Promise<void> {
    const { error } = await supabase
      .from('alertes_automatiques')
      .update({
        status,
        status_updated_at: new Date().toISOString(),
      })
      .eq('id', alertId);

    if (error) {
      console.error('Error updating alert status:', error);
      throw new Error(error.message);
    }
  }

  async assign(alertId: string, assigneeUserId: string | null): Promise<void> {
    const { error } = await supabase
      .from('alertes_automatiques')
      .update({
        assignee_user_id: assigneeUserId,
        assigned_at: assigneeUserId ? new Date().toISOString() : null,
      })
      .eq('id', alertId);

    if (error) {
      console.error('Error assigning alert:', error);
      throw new Error(error.message);
    }
  }

  async listComments(alertId: string) {
    const { data, error } = await supabase
      .from('alert_comments')
      .select('*')
      .eq('alert_id', alertId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching alert comments:', error);
      throw new Error(error.message);
    }

    return data ?? [];
  }

  async addComment(alertId: string, authorUserId: string, body: string) {
    const { error } = await supabase.from('alert_comments').insert({
      alert_id: alertId,
      author_user_id: authorUserId,
      body,
    });

    if (error) {
      console.error('Error adding alert comment:', error);
      throw new Error(error.message);
    }
  }
}
