import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReportType = "fleet_summary" | "fuel_history" | "maintenance_due" | "driver_scores" | "incidents";
export type ReportFormat = "pdf" | "excel";
export type ReportFrequency = "daily" | "weekly" | "monthly";

export interface ScheduledReport {
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

export interface ScheduledReportRun {
  id: string;
  scheduled_report_id: string;
  status: "pending" | "running" | "succeeded" | "failed";
  storage_path: string | null;
  error_message: string | null;
  started_at: string;
  finished_at: string | null;
}

export interface CreateScheduledReportInput {
  report_type: ReportType;
  format: ReportFormat;
  frequency: ReportFrequency;
  day_of_week?: number;
  day_of_month?: number;
  send_hour_utc: number;
  recipient_emails: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeNextRun(
  frequency: ReportFrequency,
  dayOfWeek: number | undefined,
  dayOfMonth: number | undefined,
  sendHourUtc: number,
): string {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(sendHourUtc, 0, 0, 0);

  if (frequency === "daily") {
    if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
    return next.toISOString();
  }
  if (frequency === "weekly") {
    const target = dayOfWeek ?? 1;
    let days = (target - now.getUTCDay() + 7) % 7;
    if (days === 0 && next <= now) days = 7;
    next.setUTCDate(now.getUTCDate() + days);
    return next.toISOString();
  }
  // monthly
  const target = dayOfMonth ?? 1;
  next.setUTCDate(target);
  if (next <= now) {
    next.setUTCMonth(next.getUTCMonth() + 1);
    next.setUTCDate(target);
  }
  return next.toISOString();
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useScheduledReports() {
  const { userFleetId } = useAuth();

  return useQuery({
    queryKey: ["scheduled-reports", userFleetId],
    queryFn: async () => {
      if (!userFleetId) return [] as ScheduledReport[];
      const { data, error } = await supabase
        .from("scheduled_reports")
        .select("*")
        .eq("fleet_id", userFleetId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ScheduledReport[];
    },
    enabled: !!userFleetId,
  });
}

export function useScheduledReportRuns(reportId?: string) {
  return useQuery({
    queryKey: ["scheduled-report-runs", reportId],
    queryFn: async () => {
      if (!reportId) return [] as ScheduledReportRun[];
      const { data, error } = await supabase
        .from("scheduled_report_runs")
        .select("*")
        .eq("scheduled_report_id", reportId)
        .order("started_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as ScheduledReportRun[];
    },
    enabled: !!reportId,
  });
}

export function useCreateScheduledReport() {
  const { userFleetId, user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateScheduledReportInput) => {
      if (!userFleetId || !user) throw new Error("Authentification requise");
      const next_run_at = computeNextRun(
        input.frequency,
        input.day_of_week,
        input.day_of_month,
        input.send_hour_utc,
      );
      const { data, error } = await supabase
        .from("scheduled_reports")
        .insert({
          ...input,
          fleet_id: userFleetId,
          created_by: user.id,
          next_run_at,
        })
        .select()
        .single();
      if (error) throw error;
      return data as ScheduledReport;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scheduled-reports", userFleetId] });
    },
  });
}

export function useToggleScheduledReport() {
  const { userFleetId } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("scheduled_reports")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scheduled-reports", userFleetId] });
    },
  });
}

export function useDeleteScheduledReport() {
  const { userFleetId } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("scheduled_reports").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scheduled-reports", userFleetId] });
    },
  });
}
