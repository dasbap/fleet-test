import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { VehicleService } from '@/services/vehicle.service';
import { VehicleRepository } from '@/repositories/vehicle.repository';

// Instances singleton des services et repositories
const vehicleRepository = new VehicleRepository();
const vehicleService = new VehicleService(vehicleRepository);

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
    queryFn: () => vehicleService.getVehicles(fleetId),
  });
}

export function useVehiclesSimple(fleetId?: string) {
  return useQuery({
    queryKey: ['vehicles-simple', fleetId],
    queryFn: () => vehicleService.getVehiclesSimple(fleetId),
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vehicle: VehicleInsert) => vehicleService.createVehicle(vehicle),
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
      return vehicleService.updateVehicle(id, updates);
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
      return vehicleService.blockVehicle(id, blocked_reason);
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
    mutationFn: (id: string) => vehicleService.unblockVehicle(id),
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
