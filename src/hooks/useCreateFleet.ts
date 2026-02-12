import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { EsambaSetupService } from '@/services/esamba-setup.service';
import { EsambaSetupRepository } from '@/repositories/esamba-setup.repository';
import type { CreateFleetParams } from '@/services/esamba-setup.service';
import { mapSupabaseErrorToFrench } from '@/lib/mapSupabaseError';

const esambaSetupRepository = new EsambaSetupRepository();
const esambaSetupService = new EsambaSetupService(esambaSetupRepository);

export interface CreateFleetResult {
  orgId: string;
  fleetId: string;
}

export interface UseCreateFleetOptions {
  onSuccess?: (data: CreateFleetResult) => void | Promise<void>;
}

export function useCreateFleet(options?: UseCreateFleetOptions) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation<CreateFleetResult, Error, CreateFleetParams>({
    mutationFn: async (values) => {
      if (!user) throw new Error('Utilisateur non connecté.');
      return esambaSetupService.createFleetAndJoin(user.id, values);
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['fleet-members'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['recent-activity'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-vehicles-overview'] });
      toast({
        title: 'Flotte créée avec succès',
        description: 'Votre flotte a été créée et vous êtes maintenant organizer. Redirection en cours...',
      });
      await options?.onSuccess?.(data);
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
