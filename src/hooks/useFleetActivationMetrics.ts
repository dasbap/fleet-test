import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { FleetActivationService } from '@/services/fleet-activation.service';
import { FleetActivationRepository } from '@/repositories/fleet-activation.repository';
import type { ActivationMetrics } from '@/types/activation-metrics';

const fleetActivationRepository = new FleetActivationRepository();
const fleetActivationService = new FleetActivationService(fleetActivationRepository);

const emptyMetrics: ActivationMetrics = {
  signupCount: 0,
  activatedDay1: 0,
  activatedDay7: 0,
  dailyClosureRate: 0,
  proofSubmissionRate: 0,
  blockedDriversCount: 0,
  averageDriverScore: 0,
};

/**
 * Métriques d'activation par flotte (RPC `fleet_activation_metrics`).
 */
export function useFleetActivationMetrics(fleetId?: string) {
  const { userFleetId } = useAuth();
  const targetFleetId = fleetId ?? userFleetId;

  return useQuery({
    queryKey: ['fleet-activation-metrics', targetFleetId],
    queryFn: async (): Promise<ActivationMetrics> => {
      if (!targetFleetId) return emptyMetrics;
      try {
        return await fleetActivationService.getFleetActivationMetrics(targetFleetId);
      } catch {
        return emptyMetrics;
      }
    },
    enabled: !!targetFleetId,
    staleTime: 60_000,
  });
}
