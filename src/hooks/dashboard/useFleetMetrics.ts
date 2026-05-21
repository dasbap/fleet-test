import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/cache/queryKeys';

export interface FleetMetrics {
  fleet_id:          string;
  period:            string;
  total_shifts:      number;
  closed_shifts:     number;
  closure_rate:      number;   // %
  revenue_gap:       number;   // XAF
  avg_closure_delay: number;   // minutes
  incident_count:    number;
  active_drivers:    number;
  computed_at:       string;
  from_cache:        boolean;
}

const EMPTY_METRICS: FleetMetrics = {
  fleet_id:          '',
  period:            '30d',
  total_shifts:      0,
  closed_shifts:     0,
  closure_rate:      0,
  revenue_gap:       0,
  avg_closure_delay: 0,
  incident_count:    0,
  active_drivers:    0,
  computed_at:       '',
  from_cache:        false,
};

/**
 * Métriques dashboard flotte 30j — lit depuis la cache table Supabase (TTL 1h)
 * via la RPC get_fleet_dashboard_metrics.
 * Remplace 6 requêtes parallèles par une seule RPC < 5ms.
 *
 * staleTime : 1 min côté React Query (la vraie fraîcheur est gérée côté Supabase via TTL 1h).
 * placeholderData : garde les données précédentes pendant un refetch (évite le flash skeleton).
 */
export function useFleetMetrics(fleetId: string | null | undefined) {
  return useQuery({
    queryKey:  queryKeys.fleet.metrics(fleetId ?? ''),
    queryFn:   async (): Promise<FleetMetrics> => {
      const { data, error } = await supabase.rpc('get_fleet_dashboard_metrics', {
        p_fleet_id: fleetId,
      });
      if (error) throw new Error(error.message);
      return (data as FleetMetrics) ?? EMPTY_METRICS;
    },
    enabled:          !!fleetId,
    staleTime:        60 * 1000,          // 1 min React Query
    gcTime:           10 * 60 * 1000,
    retry:            1,
    placeholderData:  (prev) => prev,     // garde l'affichage précédent pendant refetch
    refetchOnWindowFocus: false,
  });
}

/**
 * Invalide le cache dashboard pour une flotte (à appeler après clôture de créneau,
 * création d'incident, ou action critique).
 * Invalide aussi côté Supabase via la RPC invalidate_fleet_metrics_cache.
 */
export function useInvalidateFleetMetrics() {
  const queryClient = useQueryClient();

  return async (fleetId: string) => {
    // 1. Invalide côté React Query (UI refetch immédiat)
    await queryClient.invalidateQueries({
      queryKey: queryKeys.fleet.metrics(fleetId),
    });

    // 2. Invalide la cache Supabase (TTL supprimé → prochain accès recalcule)
    await supabase.rpc('invalidate_fleet_metrics_cache', { p_fleet_id: fleetId });
  };
}

export { EMPTY_METRICS };
