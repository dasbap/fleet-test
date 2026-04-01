import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { VehicleService } from '@/services/vehicle.service';
import { VehicleRepository } from '@/repositories/vehicle.repository';
import type {
  VehicleDto,
  VehicleInsertDto,
  VehicleStatusDto,
} from '@/types/dto/vehicle.dto';

// Instances singleton des services et repositories
const vehicleRepository = new VehicleRepository();
const vehicleService = new VehicleService(vehicleRepository);

/** @deprecated Utiliser `VehicleStatusDto` depuis `@/types/dto/vehicle.dto`. */
export type VehicleStatus = VehicleStatusDto;

/** @deprecated Utiliser `VehicleDto` depuis `@/types/dto/vehicle.dto`. */
export type Vehicle = VehicleDto;

/** @deprecated Utiliser `VehicleInsertDto` depuis `@/types/dto/vehicle.dto`. */
export type VehicleInsert = VehicleInsertDto;

export type { VehicleDto, VehicleInsertDto, VehicleStatusDto };

export function useVehicles(fleetId?: string) {
  return useQuery({
    queryKey: ['vehicles', fleetId],
    queryFn: () => vehicleService.getVehicles(fleetId),
    enabled: fleetId != null && fleetId !== '',
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
    mutationFn: (vehicle: VehicleInsertDto) => vehicleService.createVehicle(vehicle),
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
    mutationFn: async ({ id, ...updates }: Partial<VehicleDto> & { id: string }) => {
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
