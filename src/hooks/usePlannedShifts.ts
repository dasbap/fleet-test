import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { mapSupabaseErrorToFrench } from '@/lib/mapSupabaseError';
import { useAuth } from '@/hooks/useAuth';
import { PlannedShiftService } from '@/services/planned-shift.service';
import { PlannedShiftRepository } from '@/repositories/planned-shift.repository';
import { operationsQueryKeys } from '@/hooks/useOperations';
import type { PlannedShift, PlannedShiftInsert } from '@/repositories/planned-shift.repository';

const plannedShiftRepository = new PlannedShiftRepository();
const plannedShiftService = new PlannedShiftService(plannedShiftRepository);

export const plannedShiftQueryKeys = {
  all: ['planned-shifts'] as const,
  fleetToday: (fleetId?: string) => ['planned-shifts', 'fleet-today', fleetId] as const,
  driverUpcoming: (userId?: string) => ['planned-shifts', 'driver-upcoming', userId] as const,
};

export type { PlannedShift, PlannedShiftInsert };

export function usePlannedShiftsForFleetToday(fleetId?: string) {
  return useQuery({
    queryKey: plannedShiftQueryKeys.fleetToday(fleetId),
    queryFn: () =>
      fleetId ? plannedShiftService.getPlannedShiftsForFleetToday(fleetId) : Promise.resolve([]),
    enabled: !!fleetId,
  });
}

export function useUpcomingPlannedShift() {
  const { user } = useAuth();
  return useQuery({
    queryKey: plannedShiftQueryKeys.driverUpcoming(user?.id),
    queryFn: () =>
      user ? plannedShiftService.getUpcomingForDriver(user.id) : Promise.resolve(null),
    enabled: !!user,
  });
}

export function useCreatePlannedShift() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (input: Omit<PlannedShiftInsert, 'created_by'>) => {
      if (!user) {
        throw new Error('Non authentifié');
      }
      return plannedShiftService.createPlannedShift(input, user.id);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: plannedShiftQueryKeys.fleetToday(variables.fleet_id),
      });
      queryClient.invalidateQueries({ queryKey: operationsQueryKeys.all });
      toast({
        title: 'Créneau planifié',
        description: 'Le créneau a été enregistré dans le planning.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: mapSupabaseErrorToFrench(error.message),
        variant: 'destructive',
      });
    },
  });
}

export function useCancelPlannedShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (plannedShiftId: string) =>
      plannedShiftService.cancelPlannedShift(plannedShiftId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: plannedShiftQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: operationsQueryKeys.all });
      toast({
        title: 'Créneau annulé',
        description: 'Le créneau planifié a été annulé.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: mapSupabaseErrorToFrench(error.message),
        variant: 'destructive',
      });
    },
  });
}

/** Liaison silencieuse après ouverture d'un créneau opérationnel. */
export async function linkPlannedShiftOnStart(driverUserId: string, creneauId: string) {
  await plannedShiftService.linkOnShiftStart(driverUserId, creneauId);
}
