import {
  ScheduledReportRepository,
  type ReportFormat,
  type ReportFrequency,
  type ReportType,
  type ScheduledReportInsertRow,
  type ScheduledReportRow,
  type ScheduledReportRunRow,
} from '@/repositories/scheduled-report.repository';

export type {
  ReportType,
  ReportFormat,
  ReportFrequency,
  ScheduledReportRow as ScheduledReport,
  ScheduledReportRunRow as ScheduledReportRun,
};

export interface CreateScheduledReportInput {
  report_type: ReportType;
  format: ReportFormat;
  frequency: ReportFrequency;
  day_of_week?: number;
  day_of_month?: number;
  send_hour_utc: number;
  recipient_emails: string[];
}

function computeNextRun(
  frequency: ReportFrequency,
  dayOfWeek: number | undefined,
  dayOfMonth: number | undefined,
  sendHourUtc: number,
): string {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(sendHourUtc, 0, 0, 0);

  if (frequency === 'daily') {
    if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
    return next.toISOString();
  }
  if (frequency === 'weekly') {
    const target = dayOfWeek ?? 1;
    let days = (target - now.getUTCDay() + 7) % 7;
    if (days === 0 && next <= now) days = 7;
    next.setUTCDate(now.getUTCDate() + days);
    return next.toISOString();
  }
  const target = dayOfMonth ?? 1;
  next.setUTCDate(target);
  if (next <= now) {
    next.setUTCMonth(next.getUTCMonth() + 1);
    next.setUTCDate(target);
  }
  return next.toISOString();
}

/**
 * Service — rapports planifiés (calcul `next_run_at`, validation minimale).
 */
export class ScheduledReportService {
  constructor(private repository: ScheduledReportRepository) {}

  async getScheduledReports(fleetId: string): Promise<ScheduledReportRow[]> {
    if (!fleetId) return [];
    return this.repository.findByFleetId(fleetId);
  }

  async getReportRuns(reportId: string): Promise<ScheduledReportRunRow[]> {
    if (!reportId) return [];
    return this.repository.findRunsByReportId(reportId);
  }

  async createScheduledReport(
    fleetId: string,
    userId: string,
    input: CreateScheduledReportInput,
  ): Promise<ScheduledReportRow> {
    if (!fleetId || !userId) {
      throw new Error('Authentification requise');
    }
    if (!input.recipient_emails?.length) {
      throw new Error('Au moins un destinataire e-mail est requis');
    }

    const next_run_at = computeNextRun(
      input.frequency,
      input.day_of_week,
      input.day_of_month,
      input.send_hour_utc,
    );

    const row: ScheduledReportInsertRow = {
      ...input,
      fleet_id: fleetId,
      created_by: userId,
      next_run_at,
    };

    return this.repository.create(row);
  }

  async toggleActive(id: string, is_active: boolean): Promise<void> {
    if (!id) throw new Error('Identifiant du rapport requis');
    await this.repository.updateActive(id, is_active);
  }

  async deleteScheduledReport(id: string): Promise<void> {
    if (!id) throw new Error('Identifiant du rapport requis');
    await this.repository.delete(id);
  }
}
