import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { VehicleService } from '@/services/vehicle.service';
import { VehicleRepository } from '@/repositories/vehicle.repository';
import type { VehicleApi, VehicleInsertApi, VehicleStatusApi } from '@/types/api/vehicles';
import type { VehicleFilters, VehicleListItemDto } from '@/repositories/vehicle.repository';

// Instances singleton des services et repositories
const vehicleRepository = new VehicleRepository();
const vehicleService = new VehicleService(vehicleRepository);

/** @deprecated Utiliser `VehicleStatusApi` depuis `@/types/api/vehicles`. */
export type VehicleStatus = VehicleStatusApi;

/** @deprecated Utiliser `VehicleApi` depuis `@/types/api/vehicles`. */
export type Vehicle = VehicleApi;

/** @deprecated Utiliser `VehicleInsertApi` depuis `@/types/api/vehicles`. */
export type VehicleInsert = VehicleInsertApi;

export type { VehicleApi, VehicleInsertApi, VehicleStatusApi };
export type { VehicleListItemDto };

export type VehicleListFilters = Pick<VehicleFilters, 'fleet_id' | 'status' | 'search'>;

export function useVehicles(fleetId?: string) {
  return useQuery({
    queryKey: ['vehicles', fleetId],
    queryFn: () => vehicleService.getVehicles(fleetId),
    enabled: fleetId != null && fleetId !== '',
  });
}

export function useVehicleList(filters: VehicleListFilters) {
  return useQuery({
    queryKey: ['vehicles-list', filters],
    queryFn: () => vehicleService.getVehicleList(filters),
    enabled: filters.fleet_id != null && filters.fleet_id !== '',
  });
}

export function useVehiclesSimple(fleetId?: string) {
  return useQuery({
    queryKey: ['vehicles-simple', fleetId],
    queryFn: () => vehicleService.getVehiclesSimple(fleetId),
    enabled: fleetId != null && fleetId !== '',
  });
}

/** Détail d’un véhicule pour la flotte de l’utilisateur connecté. */
export function useVehicleDetail(vehicleId: string | undefined) {
  const { userFleetId } = useAuth();
  return useQuery({
    queryKey: ['vehicle', vehicleId, userFleetId],
    queryFn: () =>
      vehicleService.getVehicleDetailForFleet(vehicleId!, userFleetId),
    enabled: !!vehicleId && !!userFleetId,
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vehicle: VehicleInsertApi) => vehicleService.createVehicle(vehicle),
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
    mutationFn: async ({ id, ...updates }: Partial<VehicleApi> & { id: string }) => {
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
