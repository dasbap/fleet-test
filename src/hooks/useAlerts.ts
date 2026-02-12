import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { AlertService } from '@/services/alert.service';
import { AlertRepository } from '@/repositories/alert.repository';

const alertRepository = new AlertRepository();
const alertService = new AlertService(alertRepository);

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface Alert {
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
    },
  });
}
