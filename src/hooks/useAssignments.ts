import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface Assignment {
  id: string;
  fleet_id: string;
  vehicle_id: string;
  driver_user_id: string;
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  // Joined data
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
}

export interface Driver {
  user_id: string;
  full_name: string | null;
  phone: string | null;
  role: string;
  is_active: boolean;
}

// Fetch all drivers in a fleet
export function useFleetDrivers(fleetId?: string) {
  return useQuery({
    queryKey: ['fleet-drivers', fleetId],
    queryFn: async () => {
      if (!fleetId) return [];

      const { data, error } = await supabase
        .from('fleet_memberships')
        .select(`
          user_id,
          role,
          is_active,
          profile:profiles!fleet_memberships_user_id_fkey(user_id, full_name, phone)
        `)
        .eq('fleet_id', fleetId)
        .eq('role', 'driver')
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching drivers:', error);
        throw new Error(error.message);
      }

      return (data || []).map((d: any) => ({
        user_id: d.user_id,
        full_name: d.profile?.full_name || null,
        phone: d.profile?.phone || null,
        role: d.role,
        is_active: d.is_active,
      })) as Driver[];
    },
    enabled: !!fleetId,
  });
}

// Fetch active assignments
export function useActiveAssignments(fleetId?: string) {
  return useQuery({
    queryKey: ['active-assignments', fleetId],
    queryFn: async () => {
      let query = supabase
        .from('driver_vehicle_assignments')
        .select(`
          *,
          vehicle:vehicles!driver_vehicle_assignments_vehicle_id_fkey(id, registration, brand, model),
          driver:profiles!driver_vehicle_assignments_driver_user_id_fkey(user_id, full_name)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (fleetId) {
        query = query.eq('fleet_id', fleetId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching assignments:', error);
        throw new Error(error.message);
      }

      return data as Assignment[];
    },
  });
}

// Assign vehicle using RPC function
export function useAssignVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      fleet_id,
      vehicle_id,
      driver_user_id,
      starts_at,
    }: {
      fleet_id: string;
      vehicle_id: string;
      driver_user_id: string;
      starts_at?: string;
    }) => {
      const { data, error } = await supabase.rpc('assign_vehicle', {
        p_fleet_id: fleet_id,
        p_vehicle_id: vehicle_id,
        p_driver_user_id: driver_user_id,
        p_starts_at: starts_at || new Date().toISOString(),
      });

      if (error) {
        // Parse specific errors from the RPC function
        if (error.message.includes('vehicle_not_found')) {
          throw new Error('Véhicule non trouvé dans cette flotte');
        }
        if (error.message.includes('vehicle_blocked')) {
          throw new Error('Ce véhicule est actuellement bloqué');
        }
        if (error.message.includes('missing_closure_blocks_assignment')) {
          throw new Error('Une clôture manquante empêche cette affectation');
        }
        if (error.message.includes('driver_already_assigned')) {
          throw new Error('Ce chauffeur a déjà un véhicule affecté');
        }
        throw new Error(error.message);
      }

      return data as string; // Returns assignment ID
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['active-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-drivers'] });
      toast({
        title: 'Affectation réussie',
        description: 'Le véhicule a été affecté au chauffeur.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur d\'affectation',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// End an assignment (deactivate)
export function useEndAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assignmentId: string) => {
      const { data, error } = await supabase
        .from('driver_vehicle_assignments')
        .update({
          is_active: false,
          ends_at: new Date().toISOString(),
        })
        .eq('id', assignmentId)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['active-assignments'] });
      toast({
        title: 'Affectation terminée',
        description: 'L\'affectation a été clôturée.',
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
