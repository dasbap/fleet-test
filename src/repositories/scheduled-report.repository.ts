import { supabase } from '@/integrations/supabase/client';

export type ReportType =
  | 'fleet_summary'
  | 'fuel_history'
  | 'maintenance_due'
  | 'driver_scores'
  | 'incidents';
export type ReportFormat = 'pdf' | 'excel';
export type ReportFrequency = 'daily' | 'weekly' | 'monthly';

export interface ScheduledReportRow {
  id: string;
  fleet_id: string;
  created_by: string;
  report_type: ReportType;
  format: ReportFormat;
  frequency: ReportFrequency;
  day_of_week: number | null;
  day_of_month: number | null;
  send_hour_utc: number;
  recipient_emails: string[];
  is_active: boolean;
  last_run_at: string | null;
  next_run_at: string;
  created_at: string;
}

export interface ScheduledReportRunRow {
  id: string;
  scheduled_report_id: string;
  status: 'pending' | 'running' | 'succeeded' | 'failed';
  storage_path: string | null;
  error_message: string | null;
  started_at: string;
  finished_at: string | null;
}

export interface ScheduledReportInsertRow {
  fleet_id: string;
  created_by: string;
  report_type: ReportType;
  format: ReportFormat;
  frequency: ReportFrequency;
  day_of_week?: number;
  day_of_month?: number;
  send_hour_utc: number;
  recipient_emails: string[];
  next_run_at: string;
}

/**
 * Repository — rapports planifiés (`scheduled_reports`).
 */
export class ScheduledReportRepository {
  async findByFleetId(fleetId: string): Promise<ScheduledReportRow[]> {
    const { data, error } = await supabase
      .from('scheduled_reports')
      .select('*')
      .eq('fleet_id', fleetId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching scheduled reports:', error);
      throw new Error(error.message);
    }
    return (data ?? []) as ScheduledReportRow[];
  }

  async findRunsByReportId(reportId: string): Promise<ScheduledReportRunRow[]> {
    const { data, error } = await supabase
      .from('scheduled_report_runs')
      .select('*')
      .eq('scheduled_report_id', reportId)
      .order('started_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching scheduled report runs:', error);
      throw new Error(error.message);
    }
    return (data ?? []) as ScheduledReportRunRow[];
  }

  async create(row: ScheduledReportInsertRow): Promise<ScheduledReportRow> {
    const { data, error } = await supabase
      .from('scheduled_reports')
      .insert(row)
      .select()
      .single();

    if (error) {
      console.error('Error creating scheduled report:', error);
      throw new Error(error.message);
    }
    return data as ScheduledReportRow;
  }

  async updateActive(id: string, is_active: boolean): Promise<void> {
    const { error } = await supabase.from('scheduled_reports').update({ is_active }).eq('id', id);
    if (error) {
      console.error('Error updating scheduled report:', error);
      throw new Error(error.message);
    }
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('scheduled_reports').delete().eq('id', id);
    if (error) {
      console.error('Error deleting scheduled report:', error);
      throw new Error(error.message);
    }
  }
}
