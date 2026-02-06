import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { mapSupabaseErrorToFrench } from '@/lib/mapSupabaseError';

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
  return useQuery({
    queryKey: ['active-shift'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      
      if (!userData.user) {
        return null;
      }

      // Get active assignment first
      const { data: assignmentData } = await supabase
        .from('affectations_vehicules')
        .select('id')
        .eq('driver_user_id', userData.user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (!assignmentData) {
        return null;
      }

      // Get active shift for this assignment
      const { data, error } = await supabase
        .from('creneaux_conducteurs')
        .select(`
          *,
          assignment:affectations_vehicules!creneaux_conducteurs_assignment_id_fkey(
            id,
            fleet_id,
            vehicle_id,
            driver_user_id,
            vehicle:vehicules!affectations_vehicules_vehicle_id_fkey(
              id,
              registration,
              brand,
              model
            ),
            driver:profils!affectations_vehicules_driver_user_id_fkey(
              user_id,
              full_name
            )
          )
        `)
        .eq('assignment_id', assignmentData.id)
        .eq('status', 'open')
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

      // Get all assignments for this driver
      const { data: assignmentsData } = await supabase
        .from('affectations_vehicules')
        .select('id')
        .eq('driver_user_id', userData.user.id);

      if (!assignmentsData || assignmentsData.length === 0) {
        return [];
      }

      const assignmentIds = assignmentsData.map(a => a.id);

      // Get shifts for these assignments
      const { data, error } = await supabase
        .from('creneaux_conducteurs')
        .select(`
          *,
          assignment:affectations_vehicules!creneaux_conducteurs_assignment_id_fkey(
            id,
            fleet_id,
            vehicle_id,
            driver_user_id,
            vehicle:vehicules!affectations_vehicules_vehicle_id_fkey(
              id,
              registration,
              brand,
              model
            ),
            driver:profils!affectations_vehicules_driver_user_id_fkey(
              user_id,
              full_name
            )
          )
        `)
        .in('assignment_id', assignmentIds)
        .order('started_at', { ascending: false })
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
      assignment_id,
      km_start 
    }: { 
      assignment_id: string;
      km_start: number;
    }) => {
      const { data, error } = await supabase
        .from('creneaux_conducteurs')
        .insert({
          assignment_id,
          km_start,
          status: 'open',
        })
        .select(`
          *,
          assignment:affectations_vehicules!creneaux_conducteurs_assignment_id_fkey(
            id,
            fleet_id,
            vehicle_id,
            driver_user_id,
            vehicle:vehicules!affectations_vehicules_vehicle_id_fkey(
              id,
              registration,
              brand,
              model
            )
          )
        `)
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
      // Use the RPC function close_shift which handles everything atomically
      const { error } = await supabase.rpc('fermer_creneau', {
        p_shift_id: closure.shift_id,
        p_km_end: closure.km_end,
        p_revenue_declared: closure.revenue_declared,
        p_collection_mode: closure.collection_mode,
        p_proof_type: closure.proof_type,
        p_proof_value: closure.proof_value,
      });

      if (error) {
        throw new Error(error.message);
      }

      // Calculer la recette attendue
      const { error: expectedError } = await supabase.rpc('calculer_recette_attendue', {
        p_shift_id: closure.shift_id,
      });

      if (expectedError) {
        console.warn('Erreur lors du calcul de la recette attendue:', expectedError);
        // Ne pas bloquer la clôture si cette étape échoue
      }

      // Get the shift to update vehicle km
      const { data: shiftData } = await supabase
        .from('creneaux_conducteurs')
        .select(`
          assignment:affectations_vehicules!creneaux_conducteurs_assignment_id_fkey(
            vehicle_id
          )
        `)
        .eq('id', closure.shift_id)
        .single();

      if (shiftData?.assignment?.vehicle_id) {
        // Update vehicle km
        await supabase
          .from('vehicules')
          .update({ current_km: closure.km_end })
          .eq('id', shiftData.assignment.vehicle_id);
      }

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
  return useQuery({
    queryKey: ['shift-closures'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return [];

      // Get assignments for this driver
      const { data: assignmentsData } = await supabase
        .from('affectations_vehicules')
        .select('id')
        .eq('driver_user_id', userData.user.id);

      if (!assignmentsData || assignmentsData.length === 0) {
        return [];
      }

      const assignmentIds = assignmentsData.map(a => a.id);

      // Get shifts for these assignments
      const { data: shiftsData } = await supabase
        .from('creneaux_conducteurs')
        .select('id')
        .in('assignment_id', assignmentIds);

      if (!shiftsData || shiftsData.length === 0) {
        return [];
      }

      const shiftIds = shiftsData.map(s => s.id);

      // Get closures for these shifts
      const { data, error } = await supabase
        .from('clotures_creneaux')
        .select('*')
        .in('shift_id', shiftIds)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching closures:', error);
        return [];
      }

      return (data || []) as ShiftClosure[];
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
      status: 'validated' | 'rejected';
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const { data, error } = await supabase
        .from('clotures_creneaux')
        .update({
          status,
          validated_by: user.id,
          validated_at: new Date().toISOString(),
        })
        .eq('id', closureId)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as ShiftClosure;
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
