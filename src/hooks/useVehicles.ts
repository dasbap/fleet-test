import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export type VehicleStatus = 'active' | 'maintenance' | 'blocked' | 'inactive';

export interface Vehicle {
  id: string;
  fleet_id: string;
  plate_number: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  current_km: number;
  status: VehicleStatus;
  status_reason: string | null;
  daily_target: number;
  score: number;
  qr_code: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  driver?: {
    id: string;
    full_name: string | null;
  } | null;
}

export interface VehicleInsert {
  fleet_id: string;
  plate_number: string;
  brand?: string;
  model?: string;
  year?: number;
  current_km?: number;
  status?: VehicleStatus;
}

export function useVehicles(fleetId?: string) {
  return useQuery({
    queryKey: ['vehicles', fleetId],
    queryFn: async () => {
      let query = supabase
        .from('vehicles')
        .select(`
          *,
          driver_vehicle_assignments!inner(
            driver_id,
            is_active,
            profiles:driver_id(id, full_name)
          )
        `)
        .order('created_at', { ascending: false });

      if (fleetId) {
        query = query.eq('fleet_id', fleetId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching vehicles:', error);
        throw new Error(error.message);
      }

      // Transform data to include driver info
      return (data || []).map((vehicle: any) => {
        const activeAssignment = vehicle.driver_vehicle_assignments?.find(
          (a: any) => a.is_active
        );
        return {
          ...vehicle,
          driver: activeAssignment?.profiles || null,
          driver_vehicle_assignments: undefined,
        };
      }) as Vehicle[];
    },
  });
}

export function useVehiclesSimple(fleetId?: string) {
  return useQuery({
    queryKey: ['vehicles-simple', fleetId],
    queryFn: async () => {
      let query = supabase
        .from('vehicles')
        .select('*')
        .order('plate_number', { ascending: true });

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
        .from('vehicles')
        .insert({
          fleet_id: vehicle.fleet_id,
          plate_number: vehicle.plate_number,
          brand: vehicle.brand,
          model: vehicle.model,
          year: vehicle.year,
          current_km: vehicle.current_km || 0,
          status: vehicle.status || 'active',
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
        .from('vehicles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
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
