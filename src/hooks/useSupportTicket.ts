import { useMutation } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { SupportRepository } from '@/repositories/support.repository';
import { SupportService } from '@/services/support.service';
import type { CreateCallbackInput, CreateTicketInput } from '@/services/support.service';
import { useAuth } from '@/hooks/useAuth';

const supportRepository = new SupportRepository();
const supportService = new SupportService(supportRepository);

export function useCreateSupportTicket() {
  const { user, userFleetId } = useAuth();

  return useMutation({
    mutationFn: (input: Omit<CreateTicketInput, 'fleet_id'>) => {
      if (!user?.id) throw new Error('Connectez-vous pour ouvrir un ticket.');
      return supportService.createTicket(user.id, {
        ...input,
        fleet_id: userFleetId ?? null,
      });
    },
    onSuccess: () => {
      toast({
        title: 'Ticket créé',
        description: 'Notre équipe vous répondra sous 2h ouvrées.',
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

export function useCreateSupportCallback() {
  const { user, userFleetId } = useAuth();

  return useMutation({
    mutationFn: (input: Omit<CreateCallbackInput, 'fleet_id'>) => {
      if (!user?.id) throw new Error('Connectez-vous pour demander un rappel.');
      return supportService.createCallback(user.id, {
        ...input,
        fleet_id: userFleetId ?? null,
      });
    },
    onSuccess: () => {
      toast({
        title: 'Demande enregistrée',
        description: 'Un conseiller vous rappellera au créneau indiqué.',
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
