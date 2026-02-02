import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

export type CollectionMode = 'cash' | 'mobile_money' | 'mixed';
export type ShiftClosureStatus = 'pending' | 'approved' | 'rejected';

export interface DriverShift {
  id: string;
  assignment_id: string;
  driver_user_id: string;
  vehicle_id: string;
  km_start: number;
  km_end: number | null;
  started_at: string;
  ended_at: string | null;
  is_closed: boolean;
  vehicle?: {
    id: string;
    plate: string;
    brand: string;
    model: string;
    km: number;
  };
}

export interface ShiftClosure {
  id: string;
  shift_id: string;
  driver_user_id: string;
  km_end: number;
  revenue_declared: number;
  collection_mode: CollectionMode;
  proof_type: string | null;
  proof_value: string | null;
  status: ShiftClosureStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  notes: string | null;
  created_at: string;
}

// Mock data
const mockActiveShift: DriverShift = {
  id: "shift-1",
  assignment_id: "assign-1",
  driver_user_id: "user-1",
  vehicle_id: "vehicle-1",
  km_start: 45230,
  km_end: null,
  started_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
  ended_at: null,
  is_closed: false,
  vehicle: {
    id: "vehicle-1",
    plate: "LT 1234 A",
    brand: "Toyota",
    model: "Corolla",
    km: 45230,
  },
};

export function useActiveShift(driverUserId?: string) {
  return useQuery({
    queryKey: ['active-shift', driverUserId],
    queryFn: async () => {
      if (!driverUserId) return null;
      // TODO: Replace with Supabase query once tables are created
      return mockActiveShift;
    },
    enabled: !!driverUserId,
  });
}

export function useShiftClosures(status?: ShiftClosureStatus) {
  return useQuery({
    queryKey: ['shift-closures', status],
    queryFn: async () => {
      // TODO: Replace with Supabase query once tables are created
      return [] as ShiftClosure[];
    },
  });
}

interface CloseShiftParams {
  shiftId: string;
  kmEnd: number;
  revenueDeclared: number;
  collectionMode: CollectionMode;
  proofType?: string;
  proofValue?: string;
  notes?: string;
}

export function useCloseShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      shiftId,
      kmEnd,
      revenueDeclared,
      collectionMode,
      proofType,
      proofValue,
      notes,
    }: CloseShiftParams) => {
      // TODO: Replace with Supabase operations once tables are created
      const closure: ShiftClosure = {
        id: Math.random().toString(36).substring(7),
        shift_id: shiftId,
        driver_user_id: "user-1",
        km_end: kmEnd,
        revenue_declared: revenueDeclared,
        collection_mode: collectionMode,
        proof_type: proofType || null,
        proof_value: proofValue || null,
        status: 'pending',
        reviewed_by: null,
        reviewed_at: null,
        notes: notes || null,
        created_at: new Date().toISOString(),
      };
      return closure;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-shift'] });
      queryClient.invalidateQueries({ queryKey: ['shift-closures'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast({
        title: 'Clôture envoyée',
        description: 'Votre clôture journalière a été soumise pour validation.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useReviewClosure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      closureId,
      status,
      reviewerId,
    }: {
      closureId: string;
      status: 'approved' | 'rejected';
      reviewerId: string;
    }) => {
      // TODO: Replace with Supabase update once tables are created
      return { id: closureId, status } as ShiftClosure;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['shift-closures'] });
      toast({
        title: variables.status === 'approved' ? 'Clôture approuvée' : 'Clôture rejetée',
        description: `La clôture a été ${variables.status === 'approved' ? 'approuvée' : 'rejetée'}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
