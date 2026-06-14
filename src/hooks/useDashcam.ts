import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashcamRepository } from "@/repositories/dashcam.repository";
import {
  DashcamService,
  type Dashcam,
  type DashcamAlert,
  type DashcamAiAlertPayload,
} from "@/services/dashcam.service";

export type { Dashcam, DashcamAlert, DashcamAiAlertPayload };

const dashcamRepository = new DashcamRepository();
const dashcamService = new DashcamService(dashcamRepository);

export function useDashcams(fleetId: string | undefined) {
  return useQuery({
    queryKey: ["dashcams", fleetId],
    enabled: !!fleetId,
    queryFn: () => dashcamService.listDashcams(fleetId!),
  });
}

export function useDashcamAlerts(fleetId: string | undefined, limit = 50) {
  return useQuery({
    queryKey: ["dashcam_alerts", fleetId, limit],
    enabled: !!fleetId,
    refetchInterval: 30_000,
    queryFn: () => dashcamService.listAlerts(fleetId!, limit),
  });
}

export function useAckDashcamAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (alertId: string) => dashcamService.acknowledgeAlert(alertId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashcam_alerts"] });
    },
  });
}

export function useSendDashcamAlerts() {
  return useMutation({
    mutationFn: (alerts: DashcamAiAlertPayload[]) => dashcamService.sendAlerts(alerts),
  });
}

export function useRegisterDashcam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: Parameters<DashcamService["registerDashcam"]>[0]) =>
      dashcamService.registerDashcam(params),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["dashcams", vars.fleet_id] });
    },
  });
}
