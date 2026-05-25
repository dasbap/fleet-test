import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/cache/queryKeys';
import { DashboardService } from '@/services/dashboard.service';
import { DashboardRepository } from '@/repositories/dashboard.repository';
import { EMPTY_FLEET_METRICS, type FleetMetrics } from '@/types/fleet-metrics';

const dashboardRepository = new DashboardRepository();
const dashboardService = new DashboardService(dashboardRepository);

export type { FleetMetrics };

/**
 * Métriques dashboard flotte 30j — RPC cachée via DashboardService.
 */
export function useFleetMetrics(fleetId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.fleet.metrics(fleetId ?? ''),
    queryFn: async (): Promise<FleetMetrics> => {
      if (!fleetId) return EMPTY_FLEET_METRICS;
      return dashboardService.getFleetMetricsCached(fleetId);
    },
    enabled: !!fleetId,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: false,
  });
}

/**
 * Invalide le cache dashboard (React Query + Supabase TTL).
 */
export function useInvalidateFleetMetrics() {
  const queryClient = useQueryClient();

  return async (fleetId: string) => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.fleet.metrics(fleetId),
    });
    await dashboardService.invalidateFleetMetricsCache(fleetId);
  };
}

export { EMPTY_FLEET_METRICS as EMPTY_METRICS };
