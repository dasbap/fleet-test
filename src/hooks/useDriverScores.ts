import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface DriverScore {
  id: string;
  driver_user_id: string;
  fleet_id: string;
  score_level: 'green' | 'orange' | 'red';
  financial_score: number;
  last_calculated_at: string;
  created_at: string;
  driver?: {
    user_id: string;
    full_name: string | null;
  };
}

export function useDriverScores(fleetId?: string) {
  const { userFleetId } = useAuth();
  const targetFleetId = fleetId || userFleetId;

  return useQuery({
    queryKey: ['driver-scores', targetFleetId],
    queryFn: async () => {
      if (!targetFleetId) return [];

      const { data, error } = await supabase
        .from('scores_conducteurs')
        .select(`
          *,
          driver:profils!scores_conducteurs_driver_user_id_fkey(
            user_id,
            full_name
          )
        `)
        .eq('fleet_id', targetFleetId)
        .order('financial_score', { ascending: true });

      if (error) throw error;
      return (data || []) as DriverScore[];
    },
    enabled: !!targetFleetId,
  });
}

export function useCalculateDriverScore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ driverUserId, fleetId }: { driverUserId: string; fleetId: string }) => {
      const { data, error } = await supabase.rpc('calculer_score_conducteur', {
        p_driver_user_id: driverUserId,
        p_fleet_id: fleetId,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-scores'] });
    },
  });
}
