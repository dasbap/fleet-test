import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { mapSupabaseErrorToFrench } from '@/lib/mapSupabaseError';
import { useAuth } from '@/hooks/useAuth';
import { VehicleService } from '@/services/vehicle.service';
import { FleetBillingService } from '@/services/fleet-billing.service';
import { VehicleRepository } from '@/repositories/vehicle.repository';
import { FleetBillingRepository } from '@/repositories/fleet-billing.repository';
import { prefetchVehicleDetails } from "@/features/vehicles/prefetchVehicleDetails";
import {
  getVehicleListPlaceholder,
  saveVehicleListSnapshot,
} from "@/lib/storage/flotteEsambaLocalCache";
import { VEHICLE_QUERY_GC_MS, VEHICLE_QUERY_STALE_MS } from "@/constants/vehicle-query-cache";
import type { VehicleApi, VehicleInsertApi, VehicleStatusApi } from '@/types/api/vehicles';
import type { VehicleFilters, VehicleListItemDto } from '@/repositories/vehicle.repository';

// Instances singleton des services et repositories
const vehicleRepository = new VehicleRepository();
const fleetBillingRepository = new FleetBillingRepository();
const fleetBillingService = new FleetBillingService(fleetBillingRepository);
const vehicleService = new VehicleService(vehicleRepository, fleetBillingService);

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
    staleTime: VEHICLE_QUERY_STALE_MS,
    gcTime: VEHICLE_QUERY_GC_MS,
  });
}

export function useVehicleList(filters: VehicleListFilters) {
  const { userFleetId } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['vehicles-list', filters],
    queryFn: async () => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        const cached = getVehicleListPlaceholder(filters);
        if (cached !== undefined) {
          return cached;
        }
        throw new Error(
          "Hors ligne : aucune liste en cache pour ces filtres. Connectez-vous pour charger la flotte.",
        );
      }
      const data = await vehicleService.getVehicleList(filters);
      saveVehicleListSnapshot(filters, data);
      return data;
    },
    enabled: filters.fleet_id != null && filters.fleet_id !== '',
    staleTime: VEHICLE_QUERY_STALE_MS,
    gcTime: VEHICLE_QUERY_GC_MS,
  });

  useEffect(() => {
    if (!query.data?.length || !userFleetId) {
      return;
    }

    void prefetchVehicleDetails(
      query.data.map((vehicle) => vehicle.id),
      (vehicleId) =>
        queryClient.prefetchQuery({
          queryKey: ["vehicle", vehicleId, userFleetId],
          queryFn: () => vehicleService.getVehicleDetailForFleet(vehicleId, userFleetId),
        })
    );
  }, [query.data, queryClient, userFleetId]);

  return query;
}

export function useVehiclesSimple(fleetId?: string) {
  return useQuery({
    queryKey: ['vehicles-simple', fleetId],
    queryFn: () => vehicleService.getVehiclesSimple(fleetId),
    enabled: fleetId != null && fleetId !== '',
    staleTime: VEHICLE_QUERY_STALE_MS,
    gcTime: VEHICLE_QUERY_GC_MS,
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
    staleTime: VEHICLE_QUERY_STALE_MS,
    gcTime: VEHICLE_QUERY_GC_MS,
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vehicle: VehicleInsertApi) => vehicleService.createVehicle(vehicle),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles-simple'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles-list'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-billing-context'] });
      toast({
        title: 'Véhicule ajouté',
        description: 'Le véhicule a été créé avec succès.',
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

export function useUpdateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<VehicleApi> & { id: string }) => {
      return vehicleService.updateVehicle(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles-simple'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles-list'] });
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
      queryClient.invalidateQueries({ queryKey: ['vehicles-list'] });
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
      queryClient.invalidateQueries({ queryKey: ['vehicles-list'] });
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
