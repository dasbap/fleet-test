import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { DriverProfileRepository } from '@/repositories/driver-profile.repository';
import { DriverLicenseRepository } from '@/repositories/driver-license.repository';
import { DriverProfileService } from '@/services/driver-profile.service';
import { DriverLicenseService } from '@/services/driver-license.service';

const driverProfileRepository = new DriverProfileRepository();
const driverProfileService = new DriverProfileService(driverProfileRepository);
const driverLicenseRepository = new DriverLicenseRepository();
const driverLicenseService = new DriverLicenseService(driverLicenseRepository);

export function useDriverProfile(driverUserId?: string, fleetId?: string) {
  return useQuery({
    queryKey: ['driver-profile', fleetId, driverUserId],
    queryFn: () => {
      if (!driverUserId || !fleetId) return null;
      return driverProfileService.getDriverProfile(driverUserId, fleetId);
    },
    enabled: !!driverUserId && !!fleetId,
  });
}

export function useUpdateDriverProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      driverUserId,
      updates,
    }: {
      driverUserId: string;
      updates: Parameters<DriverProfileService['updateDriverProfile']>[1];
    }) => driverProfileService.updateDriverProfile(driverUserId, updates),
    onSuccess: (profile) => {
      queryClient.invalidateQueries({ queryKey: ['driver-profile'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-drivers'] });
      queryClient.invalidateQueries({ queryKey: ['driver-terrain-self'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-driver-activation-health'] });
      toast({
        title: 'Profil conducteur mis à jour',
        description: `${profile.full_name ?? 'Le conducteur'} a été mis à jour.`,
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

export function useDriverLicenses(driverUserId?: string, fleetId?: string) {
  return useQuery({
    queryKey: ['driver-licenses', fleetId, driverUserId],
    queryFn: () => {
      if (!driverUserId || !fleetId) return [];
      return driverLicenseService.getDriverLicenses(driverUserId, fleetId);
    },
    enabled: !!driverUserId && !!fleetId,
  });
}

export function useCreateDriverLicense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Parameters<DriverLicenseService['createDriverLicense']>[0]) =>
      driverLicenseService.createDriverLicense(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-licenses'] });
      toast({
        title: 'Permis ajouté',
        description: 'Le permis conducteur a été enregistré.',
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

export function useUpdateDriverLicense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: Parameters<DriverLicenseService['updateDriverLicense']>[1];
    }) => driverLicenseService.updateDriverLicense(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-licenses'] });
      toast({
        title: 'Permis mis à jour',
        description: 'Le statut du permis a été modifié.',
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
