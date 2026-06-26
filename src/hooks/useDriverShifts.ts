import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { mapSupabaseErrorToFrench } from '@/lib/mapSupabaseError';
import { useAuth } from '@/hooks/useAuth';
import { DriverShiftService } from '@/services/driver-shift.service';
import { DriverShiftRepository } from '@/repositories/driver-shift.repository';
import { VehicleRepository } from '@/repositories/vehicle.repository';
import { OfflineQueueService } from '@/services/offlineQueue.service';
import { linkPlannedShiftOnStart } from '@/hooks/usePlannedShifts';
import { operationsQueryKeys } from '@/hooks/useOperations';
import type { CollectionMode } from '@/domain/constants/collectionMode';

// Instances singleton des services et repositories
const driverShiftRepository = new DriverShiftRepository();
const vehicleRepository = new VehicleRepository();
const driverShiftService = new DriverShiftService(driverShiftRepository, vehicleRepository);
const offlineQueueService = new OfflineQueueService();

// Réexporter les types pour compatibilité
export type ShiftStatus = 'open' | 'closed';
export type { CollectionMode };

export interface DriverShift {
  id: string;
  assignment_id: string;
  km_start: number;
  km_end: number | null;
  started_at: string;
  ended_at: string | null;
  status: ShiftStatus;
  // Joined data via assignment
  assignment?: {
    id: string;
    fleet_id: string;
    vehicle_id: string;
    driver_user_id: string;
    vehicle?: {
      id: string;
      registration: string;
      brand: string | null;
      model: string | null;
    } | null;
    driver?: {
      user_id: string;
      full_name: string | null;
    } | null;
  } | null;
}

export interface ShiftClosure {
  id: string;
  shift_id: string;
  revenue_declared: number;
  expected_revenue: number | null;
  revenue_gap: number | null;
  collection_mode: CollectionMode;
  proof_type: string;
  proof_value: string;
  status: 'pending' | 'validated' | 'rejected';
  validated_by: string | null;
  validated_at: string | null;
  created_at: string;
}

export interface ShiftClosureInsert {
  shift_id: string;
  km_end: number;
  revenue_declared: number;
  collection_mode: CollectionMode;
  proof_type: string;
  proof_value: string;
}

export function useActiveShift() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['active-shift', user?.id],
    queryFn: () => (user ? driverShiftService.getActiveShift(user.id) : Promise.resolve(null)),
    enabled: !!user,
  });
}

export function useDriverShifts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['driver-shifts', user?.id],
    queryFn: () => (user ? driverShiftService.getDriverShifts(user.id, 20) : Promise.resolve([])),
    enabled: !!user,
  });
}

export function useDriverShift(creneauId: string | undefined) {
  return useQuery({
    queryKey: ['driver-shift', creneauId],
    queryFn: () => driverShiftService.getShiftById(creneauId!),
    enabled: Boolean(creneauId),
  });
}

export function useStartShift() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const activeShiftKey = ['active-shift', user?.id] as const;

  return useMutation({
    mutationFn: async ({
      assignment_id,
      km_start,
    }: {
      assignment_id: string;
      km_start: number;
    }) => {
      const payload = driverShiftService.buildOfflineShiftStartPayload({ assignment_id, km_start });
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        await offlineQueueService.enqueueShiftStart(payload);
        return { kind: 'queued' as const };
      }
      return driverShiftService.startShift({ assignment_id, km_start });
    },
    onMutate: async ({ assignment_id, km_start }) => {
      await queryClient.cancelQueries({ queryKey: activeShiftKey });
      await queryClient.cancelQueries({ queryKey: ['driver-shifts'] });
      const previousActive = queryClient.getQueryData<DriverShift | null>(activeShiftKey);
      const optimisticShift: DriverShift = {
        id: `offline-${crypto.randomUUID()}`,
        assignment_id,
        km_start,
        km_end: null,
        started_at: new Date().toISOString(),
        ended_at: null,
        status: 'open',
      };
      queryClient.setQueryData(activeShiftKey, optimisticShift);
      return { previousActive };
    },
    onSuccess: async (result, _variables) => {
      if ((result as { kind?: string })?.kind === 'queued') {
        toast({
          title: 'Hors ligne',
          description: 'Démarrage enregistré sur l’appareil. Synchronisation automatique au retour réseau.',
        });
      } else {
        toast({
          title: 'Journée démarrée',
          description: 'Votre créneau a été enregistré.',
        });
        if (user?.id && (result as DriverShift)?.id) {
          try {
            await linkPlannedShiftOnStart(user.id, (result as DriverShift).id);
          } catch {
            // Liaison planifiée non bloquante
          }
        }
      }
      queryClient.invalidateQueries({ queryKey: activeShiftKey });
      queryClient.invalidateQueries({ queryKey: ['driver-shifts'] });
      queryClient.invalidateQueries({ queryKey: operationsQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: ['planned-shifts'] });
      if ((result as { kind?: string })?.kind !== 'queued') {
        queryClient.invalidateQueries({ queryKey: ['driver-terrain-self'] });
        queryClient.invalidateQueries({ queryKey: ['fleet-driver-activation-health'] });
      }
    },
    onError: (error: Error) => {
      queryClient.invalidateQueries({ queryKey: activeShiftKey });
      queryClient.invalidateQueries({ queryKey: ['driver-shifts'] });
      toast({
        title: 'Erreur',
        description: mapSupabaseErrorToFrench(error.message),
        variant: 'destructive',
      });
    },
  });
}

export function useCloseShift() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const activeShiftKey = ['active-shift', user?.id] as const;

  return useMutation({
    mutationFn: async (closure: ShiftClosureInsert) => {
      const payload = driverShiftService.buildOfflineShiftClosePayload(closure);
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        await offlineQueueService.enqueueShiftClose(payload);
        return { success: true, kind: 'queued' as const };
      }
      await driverShiftService.closeShift(closure);
      return { success: true, kind: 'created' as const };
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: activeShiftKey });
      const previousActive = queryClient.getQueryData<DriverShift | null>(activeShiftKey);
      queryClient.setQueryData(activeShiftKey, null);
      return { previousActive };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: activeShiftKey });
      queryClient.invalidateQueries({ queryKey: ['driver-shifts'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-pending-closures'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: operationsQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: ['driver-terrain-self'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-driver-activation-health'] });
      toast({
        title: result.kind === 'queued' ? 'Clôture enregistrée hors ligne' : 'Journée clôturée',
        description:
          result.kind === 'queued'
            ? 'La clôture sera synchronisée automatiquement à la reconnexion.'
            : 'Votre clôture a été enregistrée avec succès.',
      });
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousActive !== undefined) {
        queryClient.setQueryData(activeShiftKey, context.previousActive);
      }
      toast({
        title: 'Erreur',
        description: mapSupabaseErrorToFrench(error.message),
        variant: 'destructive',
      });
    },
  });
}

// Legacy export for backward compatibility
export function useShiftClosures() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['shift-closures', user?.id],
    queryFn: () => (user ? driverShiftService.getShiftClosures(user.id) : Promise.resolve([])),
    enabled: !!user,
  });
}

export function useReviewClosure() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      closureId,
      status,
    }: {
      closureId: string;
      status: 'validated' | 'rejected';
    }) => {
      if (!user) throw new Error('Non authentifié');
      return driverShiftService.reviewClosure(closureId, status, user.id);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['shift-closures'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-pending-closures'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-validation'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['operations'] });
      toast({
        title: variables.status === 'validated' ? 'Clôture approuvée' : 'Clôture rejetée',
        description: `La clôture a été ${variables.status === 'validated' ? 'approuvée' : 'rejetée'}.`,
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
