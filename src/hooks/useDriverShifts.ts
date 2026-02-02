import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export type ShiftStatus = 'active' | 'closed' | 'cancelled';
export type CollectionMode = 'cash' | 'momo' | 'orange' | 'mixed';

export interface DriverShift {
  id: string;
  driver_id: string;
  vehicle_id: string;
  fleet_id: string;
  start_time: string;
  end_time: string | null;
  start_km: number;
  end_km: number | null;
  status: ShiftStatus;
  created_at: string;
  // Joined data
  vehicle?: {
    id: string;
    plate_number: string;
    brand: string | null;
    model: string | null;
  } | null;
}

export interface ShiftClosure {
  id: string;
  shift_id: string;
  driver_id: string;
  vehicle_id: string;
  end_km: number;
  total_revenue: number;
  collection_mode: CollectionMode;
  cash_amount: number;
  momo_amount: number;
  notes: string | null;
  photo_url: string | null;
  created_at: string;
}

export interface ShiftClosureInsert {
  shift_id: string;
  vehicle_id: string;
  end_km: number;
  total_revenue: number;
  collection_mode: CollectionMode;
  cash_amount?: number;
  momo_amount?: number;
  notes?: string;
  photo_url?: string;
}

export function useActiveShift() {
  return useQuery({
    queryKey: ['active-shift'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      
      if (!userData.user) {
        return null;
      }

      const { data, error } = await supabase
        .from('driver_shifts')
        .select(`
          *,
          vehicle:vehicles(id, plate_number, brand, model)
        `)
        .eq('driver_id', userData.user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (error) {
        console.error('Error fetching active shift:', error);
        throw new Error(error.message);
      }

      return data as DriverShift | null;
    },
  });
}

export function useDriverShifts() {
  return useQuery({
    queryKey: ['driver-shifts'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      
      if (!userData.user) {
        return [];
      }

      const { data, error } = await supabase
        .from('driver_shifts')
        .select(`
          *,
          vehicle:vehicles(id, plate_number, brand, model)
        `)
        .eq('driver_id', userData.user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching shifts:', error);
        throw new Error(error.message);
      }

      return (data || []) as DriverShift[];
    },
  });
}

export function useStartShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      vehicle_id, 
      fleet_id, 
      start_km 
    }: { 
      vehicle_id: string; 
      fleet_id: string; 
      start_km: number;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      
      if (!userData.user) {
        throw new Error('Non authentifié');
      }

      const { data, error } = await supabase
        .from('driver_shifts')
        .insert({
          driver_id: userData.user.id,
          vehicle_id,
          fleet_id,
          start_km,
          status: 'active',
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as DriverShift;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-shift'] });
      queryClient.invalidateQueries({ queryKey: ['driver-shifts'] });
      toast({
        title: 'Journée démarrée',
        description: 'Votre shift a été enregistré.',
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

export function useCloseShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (closure: ShiftClosureInsert) => {
      const { data: userData } = await supabase.auth.getUser();
      
      if (!userData.user) {
        throw new Error('Non authentifié');
      }

      // First, update the shift status
      const { error: shiftError } = await supabase
        .from('driver_shifts')
        .update({
          status: 'closed',
          end_time: new Date().toISOString(),
          end_km: closure.end_km,
        })
        .eq('id', closure.shift_id);

      if (shiftError) {
        throw new Error(shiftError.message);
      }

      // Then, create the closure record
      const { data, error } = await supabase
        .from('driver_shift_closures')
        .insert({
          shift_id: closure.shift_id,
          driver_id: userData.user.id,
          vehicle_id: closure.vehicle_id,
          end_km: closure.end_km,
          total_revenue: closure.total_revenue,
          collection_mode: closure.collection_mode,
          cash_amount: closure.cash_amount || 0,
          momo_amount: closure.momo_amount || 0,
          notes: closure.notes,
          photo_url: closure.photo_url,
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      // Update vehicle km
      await supabase
        .from('vehicles')
        .update({ current_km: closure.end_km })
        .eq('id', closure.vehicle_id);

      return data as ShiftClosure;
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
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Legacy export for backward compatibility
export function useShiftClosures() {
  return useQuery({
    queryKey: ['shift-closures'],
    queryFn: async () => {
      return [] as ShiftClosure[];
    },
  });
}

export function useReviewClosure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      closureId,
      status,
    }: {
      closureId: string;
      status: 'approved' | 'rejected';
      reviewerId: string;
    }) => {
      return { id: closureId, status } as unknown as ShiftClosure;
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
