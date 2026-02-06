import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export type VehicleStatus = 'ok' | 'blocked';

export interface Vehicle {
  id: string;
  fleet_id: string;
  registration: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  current_km: number;
  status: VehicleStatus;
  blocked_reason: string | null;
  created_at: string;
  // Joined data
  active_assignment?: {
    id: string;
    driver_user_id: string;
    driver?: {
      user_id: string;
      full_name: string | null;
    } | null;
  } | null;
}

export interface VehicleInsert {
  fleet_id: string;
  registration: string;
  brand?: string;
  model?: string;
  year?: number;
  current_km?: number;
}

export function useVehicles(fleetId?: string) {
  return useQuery({
    queryKey: ['vehicles', fleetId],
    queryFn: async () => {
      // First try to get vehicles with active assignments
      let query = supabase
        .from('vehicules')
        .select('*')
        .order('created_at', { ascending: false });

      if (fleetId) {
        query = query.eq('fleet_id', fleetId);
      }

      const { data: vehiclesData, error } = await query;

      if (error) {
        console.error('Error fetching vehicles:', error);
        throw new Error(error.message);
      }

      // Get active assignments with driver profiles
      const vehicleIds = (vehiclesData || []).map(v => v.id);
      
      if (vehicleIds.length === 0) {
        return [] as Vehicle[];
      }

      const { data: assignmentsData } = await supabase
        .from('affectations_vehicules')
        .select(`
          id,
          vehicle_id,
          driver_user_id,
          driver:profils!affectations_vehicules_driver_user_id_fkey(user_id, full_name)
        `)
        .in('vehicle_id', vehicleIds)
        .eq('is_active', true);

      // Map assignments to vehicles
      const assignmentMap = new Map();
      (assignmentsData || []).forEach((a: any) => {
        assignmentMap.set(a.vehicle_id, {
          id: a.id,
          driver_user_id: a.driver_user_id,
          driver: a.driver,
        });
      });

      return (vehiclesData || []).map((vehicle: any) => ({
        ...vehicle,
        active_assignment: assignmentMap.get(vehicle.id) || null,
      })) as Vehicle[];
    },
  });
}

export function useVehiclesSimple(fleetId?: string) {
  return useQuery({
    queryKey: ['vehicles-simple', fleetId],
    queryFn: async () => {
      let query = supabase
        .from('vehicules')
        .select('*')
        .order('registration', { ascending: true });

      if (fleetId) {
        query = query.eq('fleet_id', fleetId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching vehicles:', error);
        throw new Error(error.message);
      }

      return data as Vehicle[];
    },
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vehicle: VehicleInsert) => {
      const { data, error } = await supabase
        .from('vehicules')
        .insert({
          fleet_id: vehicle.fleet_id,
          registration: vehicle.registration,
          brand: vehicle.brand,
          model: vehicle.model,
          year: vehicle.year,
          current_km: vehicle.current_km || 0,
          status: 'ok',
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as Vehicle;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles-simple'] });
      toast({
        title: 'Véhicule ajouté',
        description: 'Le véhicule a été créé avec succès.',
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

export function useUpdateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Vehicle> & { id: string }) => {
      const { data, error } = await supabase
        .from('vehicules')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as Vehicle;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles-simple'] });
      toast({
        title: 'Véhicule modifié',
        description: 'Les modifications ont été enregistrées.',
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

export function useBlockVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, blocked_reason }: { id: string; blocked_reason: string }) => {
      const { data, error } = await supabase
        .from('vehicules')
        .update({ 
          status: 'blocked' as VehicleStatus, 
          blocked_reason 
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as Vehicle;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast({
        title: 'Véhicule bloqué',
        description: 'Le véhicule a été mis hors service.',
        variant: 'destructive',
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

export function useUnblockVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('vehicules')
        .update({ 
          status: 'ok' as VehicleStatus, 
          blocked_reason: null 
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as Vehicle;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast({
        title: 'Véhicule débloqué',
        description: 'Le véhicule est de nouveau actif.',
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
