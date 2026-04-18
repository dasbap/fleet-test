import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { FleetDriverActivationRepository } from '@/repositories/fleet-driver-activation.repository';

const repo = new FleetDriverActivationRepository();

/**
 * Santé activation terrain par flotte (téléphone + au moins un créneau).
 * Réservé aux rôles avec visibilité flotte (pas nécessaire pour conducteur seul).
 */
export function useFleetDriverActivationHealth(fleetId?: string) {
  const { userFleetId } = useAuth();
  const target = fleetId ?? userFleetId;

  return useQuery({
    queryKey: ['fleet-driver-activation-health', target],
    queryFn: () => (target ? repo.getFleetHealth(target) : null),
    enabled: !!target,
    staleTime: 45_000,
  });
}
