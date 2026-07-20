import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { ScheduledReportService } from '@/services/scheduled-report.service';
import { ScheduledReportRepository } from '@/repositories/scheduled-report.repository';
import type {
  CreateScheduledReportInput,
  ReportFormat,
  ReportFrequency,
  ReportType,
  ScheduledReport,
  ScheduledReportRun,
} from '@/services/scheduled-report.service';

const scheduledReportRepository = new ScheduledReportRepository();
const scheduledReportService = new ScheduledReportService(scheduledReportRepository);

export type {
  ReportType,
  ReportFormat,
  ReportFrequency,
  ScheduledReport,
  ScheduledReportRun,
  CreateScheduledReportInput,
};

export function useScheduledReports() {
  const { userFleetId } = useAuth();

  return useQuery({
    queryKey: ['scheduled-reports', userFleetId],
    queryFn: () =>
      userFleetId
        ? scheduledReportService.getScheduledReports(userFleetId)
        : Promise.resolve([] as ScheduledReport[]),
    enabled: !!userFleetId,
  });
}

export function useScheduledReportRuns(reportId?: string) {
  return useQuery({
    queryKey: ['scheduled-report-runs', reportId],
    queryFn: () =>
      reportId
        ? scheduledReportService.getReportRuns(reportId)
        : Promise.resolve([] as ScheduledReportRun[]),
    enabled: !!reportId,
  });
}

export function useCreateScheduledReport() {
  const { userFleetId, user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateScheduledReportInput) => {
      if (!userFleetId || !user) throw new Error('Authentification requise');
      return scheduledReportService.createScheduledReport(userFleetId, user.id, input);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scheduled-reports', userFleetId] });
    },
  });
}

export function useToggleScheduledReport() {
  const { userFleetId } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      scheduledReportService.toggleActive(id, is_active),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scheduled-reports', userFleetId] });
    },
  });
}

export function useDeleteScheduledReport() {
  const { userFleetId } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => scheduledReportService.deleteScheduledReport(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scheduled-reports', userFleetId] });
    },
  });
}
