import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { EsambaSetupService } from '@/services/esamba-setup.service';
import { EsambaSetupRepository } from '@/repositories/esamba-setup.repository';
import type { SeedResult } from '@/services/esamba-setup.service';

const esambaSetupRepository = new EsambaSetupRepository();
const esambaSetupService = new EsambaSetupService(esambaSetupRepository);

export function useSeedEsambaData() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation<SeedResult, Error>({
    mutationFn: async () => {
      if (!user) throw new Error('Utilisateur non connecté.');
      return esambaSetupService.seedEsambaData(user.id);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['esamba-data-verification'] });
      toast({
        title: 'Données ESAMBA prêtes',
        description: `Organisation, flotte, véhicule et invitation ${result.invitationCode} sont disponibles.`,
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
