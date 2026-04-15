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
  score_total: number | null;
  incidents_score: number | null;
  closure_delay_score: number | null;
  shift_discipline_score: number | null;
  operational_stability_score: number | null;
  model_version: string | null;
  model_metadata: Record<string, unknown> | null;
  last_calculated_at: string;
  created_at: string;
  driver?: {
    user_id: string;
    full_name: string | null;
  };
}

export interface DriverScoreSnapshot {
  id: string;
  fleet_id: string;
  driver_user_id: string;
  score_level: 'green' | 'orange' | 'red';
  score_total: number;
  incidents_score: number;
  closure_delay_score: number;
  shift_discipline_score: number;
  operational_stability_score: number;
  model_version: string;
  model_metadata: Record<string, unknown>;
  calculated_at: string;
  created_at: string;
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
      driverScoreService.calculateDriverScore(driverUserId, fleetId, 'v1-hybrid'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-scores'] });
      queryClient.invalidateQueries({ queryKey: ['driver-score-snapshots'] });
    },
  });
}

export function useDriverScoreSnapshots(driverUserId?: string, fleetId?: string) {
  const { userFleetId } = useAuth();
  const targetFleetId = fleetId || userFleetId;

  return useQuery({
    queryKey: ['driver-score-snapshots', targetFleetId, driverUserId],
    queryFn: () => {
      if (!targetFleetId || !driverUserId) return [];
      return driverScoreService.getDriverScoreSnapshots(driverUserId, targetFleetId);
    },
    enabled: !!targetFleetId && !!driverUserId,
  });
}
