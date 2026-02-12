import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { FleetMembership } from '@/hooks/useAuth';
import { FleetService } from '@/services/fleet.service';
import { FleetRepository } from '@/repositories/fleet.repository';
import type { FleetInfo } from '@/repositories/fleet.repository';

const fleetRepository = new FleetRepository();
const fleetService = new FleetService(fleetRepository);

export type { FleetInfo };

export interface UseUserFleetsResult {
  fleets: FleetInfo[];
  fleetById: Record<string, FleetInfo>;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  /** Alias de refetch pour compatibilité (ex. Profile) */
  refresh: () => void;
}

/**
 * Charge les flottes correspondant aux adhésions de l'utilisateur via le service (useQuery).
 * Expose fleetById pour des lookups O(1).
 */
export function useUserFleets(memberships: FleetMembership[]): UseUserFleetsResult {
  const fleetIds = useMemo(() => memberships.map((m) => m.fleet_id), [memberships]);

  const { data: fleets = [], isLoading, error, refetch } = useQuery({
    queryKey: ['user-fleets', fleetIds],
    queryFn: () => fleetService.getFleetsByIds(fleetIds),
    enabled: fleetIds.length > 0,
  });

  const fleetById = useMemo(() => {
    const map: Record<string, FleetInfo> = {};
    for (const f of fleets) {
      map[f.id] = f;
    }
    return map;
  }, [fleets]);

  return {
    fleets,
    fleetById,
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
    refresh: refetch,
  };
}
