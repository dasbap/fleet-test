import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/cache/queryKeys';

export interface DriverScoreRow {
  driver_user_id:     string;
  full_name:          string | null;
  phone:              string | null;
  score_total:        number;
  score_level:        'green' | 'yellow' | 'orange' | 'red';
  financial_score:    number;
  incidents_score:    number;
  last_calculated_at: string | null;
}

/**
 * Top conducteurs par score sur 30j — via RPC get_top_driver_scores.
 * Lit depuis scores_conducteurs (upsert horaire via Edge Function refresh-analytics).
 * staleTime : 5 min (scores recalculés toutes les heures).
 */
export function useTopDriverScores(fleetId: string | null | undefined, limit = 10) {
  return useQuery({
    queryKey:  queryKeys.drivers.topScores(fleetId ?? ''),
    queryFn:   async (): Promise<DriverScoreRow[]> => {
      const { data, error } = await supabase.rpc('get_top_driver_scores', {
        p_fleet_id: fleetId,
        p_limit:    limit,
      });
      if (error) throw new Error(error.message);
      return (data as DriverScoreRow[]) ?? [];
    },
    enabled:              !!fleetId,
    staleTime:            5 * 60 * 1000,
    gcTime:               30 * 60 * 1000,
    retry:                1,
    placeholderData:      (prev) => prev,
    refetchOnWindowFocus: false,
  });
}
