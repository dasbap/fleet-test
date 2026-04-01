import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { DriverScoreService } from '@/services/driver-score.service';
import { DriverScoreRepository } from '@/repositories/driver-score.repository';

const driverScoreRepository = new DriverScoreRepository();
const driverScoreService = new DriverScoreService(driverScoreRepository);

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
      try {
        return await driverScoreService.getDriverScores(targetFleetId);
      } catch {
        // En mode démo/offline, on garde le dashboard fonctionnel sans bloquer le rendu.
        return [];
      }
    },
    enabled: !!targetFleetId,
  });
}

export function useCalculateDriverScore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ driverUserId, fleetId }: { driverUserId: string; fleetId: string }) =>
      driverScoreService.calculateDriverScore(driverUserId, fleetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-scores'] });
    },
  });
}
