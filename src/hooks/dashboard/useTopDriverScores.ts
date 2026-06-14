import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/cache/queryKeys';
import { DriverScoreRepository } from '@/repositories/driver-score.repository';
import { DriverScoreService, type TopDriverScoreRow } from '@/services/driver-score.service';

export type { TopDriverScoreRow as DriverScoreRow };

const driverScoreRepository = new DriverScoreRepository();
const driverScoreService = new DriverScoreService(driverScoreRepository);

/**
 * Top conducteurs par score sur 30j — via RPC get_top_driver_scores.
 * Lit depuis scores_conducteurs (upsert horaire via Edge Function refresh-analytics).
 * staleTime : 5 min (scores recalculés toutes les heures).
 */
export function useTopDriverScores(fleetId: string | null | undefined, limit = 10) {
  return useQuery({
    queryKey: queryKeys.drivers.topScores(fleetId ?? ''),
    queryFn: () => driverScoreService.getTopDriverScores(fleetId!, limit),
    enabled: !!fleetId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: false,
  });
}
