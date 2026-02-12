import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { mapSupabaseErrorToFrench } from '@/lib/mapSupabaseError';
import { useAuth } from '@/hooks/useAuth';
import { DriverShiftService } from '@/services/driver-shift.service';
import { DriverShiftRepository } from '@/repositories/driver-shift.repository';
import { VehicleRepository } from '@/repositories/vehicle.repository';

// Instances singleton des services et repositories
const driverShiftRepository = new DriverShiftRepository();
const vehicleRepository = new VehicleRepository();
const driverShiftService = new DriverShiftService(driverShiftRepository, vehicleRepository);

// Réexporter les types pour compatibilité
export type ShiftStatus = 'open' | 'closed';
export type CollectionMode = 'cash' | 'momo' | 'mix';

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

export function useStartShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      assignment_id,
      km_start,
    }: {
      assignment_id: string;
      km_start: number;
    }) => {
      return driverShiftService.startShift({ assignment_id, km_start });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-shift'] });
      queryClient.invalidateQueries({ queryKey: ['driver-shifts'] });
      toast({
        title: 'Journée démarrée',
        description: 'Votre créneau a été enregistré.',
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

export function useCloseShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (closure: ShiftClosureInsert) => {
      await driverShiftService.closeShift(closure);
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-shift'] });
      queryClient.invalidateQueries({ queryKey: ['driver-shifts'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast({
        title: 'Journée clôturée',
        description: 'Votre clôture a été enregistrée avec succès.',
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
