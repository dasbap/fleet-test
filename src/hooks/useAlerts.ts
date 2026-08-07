import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { AlertService } from "@/services/alert.service";
import { AlertRepository } from "@/repositories/alert.repository";
import type {
  AlertDto,
  OperationalAlertSeverityDto,
  OperationalAlertTypeDto,
  IncidentWorkflowStatusDto,
} from "@/types/dto/alert.dto";
import type { Alert, AlertFilters } from "@/types/alert";

const alertRepository = new AlertRepository();
const alertService = new AlertService(alertRepository);

/** @deprecated Utiliser `OperationalAlertSeverityDto` depuis `@/types/dto/alert.dto`. */
export type AlertSeverity = OperationalAlertSeverityDto;

/** @deprecated Utiliser `OperationalAlertTypeDto` depuis `@/types/dto/alert.dto`. */
export type AlertType = OperationalAlertTypeDto;

export type { AlertDto, OperationalAlertSeverityDto, OperationalAlertTypeDto };
export type { Alert };

export function useAlerts(fleetId?: string) {
  const { userFleetId } = useAuth();
  const targetFleetId = fleetId || userFleetId;

  return useQuery({
    queryKey: ['alerts', targetFleetId],
    queryFn: () => (targetFleetId ? alertService.getUnresolvedAlerts(targetFleetId) : []),
    enabled: !!targetFleetId,
    refetchInterval: 60000,
  });
}

export function useAlertsList(partialFilters?: Omit<AlertFilters, "fleetId">) {
  const { userFleetId } = useAuth();
  const fleetId = userFleetId;

  const filters: AlertFilters | undefined = fleetId
    ? {
        fleetId,
        status: partialFilters?.status,
        severity: partialFilters?.severity,
        type: partialFilters?.type,
        search: partialFilters?.search,
      }
    : undefined;

  return useQuery({
    queryKey: ["alerts-list", filters],
    queryFn: () =>
      filters ? alertService.getAlertsForFleetWithFilters(filters) : [],
    enabled: !!filters?.fleetId,
    staleTime: 60_000,
  });
}

/** Alertes opérationnelles non résolues liées à un véhicule donné pour la flotte courante. */
export function useVehicleAlerts(vehicleId: string | undefined) {
  const { userFleetId } = useAuth();
  const enabled = !!vehicleId && !!userFleetId;

  return useQuery({
    queryKey: ["vehicleAlerts", vehicleId, userFleetId],
    queryFn: () =>
      enabled
        ? alertService.getVehicleAlertsForFleet(vehicleId!, userFleetId!)
        : [],
    enabled,
    refetchInterval: 60000,
  });
}

/** Détail d’une alerte pour la flotte courante (résolue ou non). */
export function useAlertDetail(alertId: string | undefined) {
  const { userFleetId } = useAuth();
  return useQuery({
    queryKey: ['alert', alertId, userFleetId],
    queryFn: () =>
      alertService.getAlertByIdForFleet(alertId!, userFleetId!),
    enabled: !!alertId && !!userFleetId,
  });
}

export function useGenerateAlerts() {
  const queryClient = useQueryClient();
  const { userFleetId } = useAuth();

  return useMutation({
    mutationFn: (fleetId?: string) => {
      const targetFleetId = fleetId || userFleetId;
      if (!targetFleetId) throw new Error('No fleet ID');
      return alertService.generateAlerts(targetFleetId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}

export function useResolveAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ alertId, resolvedBy }: { alertId: string; resolvedBy: string }) =>
      alertService.resolveAlert(alertId, resolvedBy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['alerts-list'] });
      queryClient.invalidateQueries({ queryKey: ['alert'] });
    },
  });
}

export function useUpdateAlertStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { alertId: string; status: IncidentWorkflowStatusDto }) =>
      alertService.updateAlertStatus(payload.alertId, payload.status),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      queryClient.invalidateQueries({ queryKey: ["alert", variables.alertId] });
    },
  });
}

export function useAssignAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { alertId: string; assigneeUserId: string | null }) =>
      alertService.assignAlert(payload.alertId, payload.assigneeUserId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      queryClient.invalidateQueries({ queryKey: ["alert", variables.alertId] });
    },
  });
}

export function useAlertComments(alertId: string | undefined) {
  return useQuery({
    queryKey: ["alertComments", alertId],
    queryFn: () => (alertId ? alertService.getAlertComments(alertId) : []),
    enabled: !!alertId,
  });
}

export function useAddAlertComment(alertId: string | undefined) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (body: string) => {
      if (!alertId) {
        throw new Error("alertId manquant");
      }
      const userId = user?.id;
      if (!userId) {
        throw new Error("Utilisateur non authentifié");
      }
      return alertService.addAlertComment(alertId, userId, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alertComments", alertId] });
    },
  });
}
