import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { InvitationService } from '@/services/invitation.service';
import { InvitationRepository } from '@/repositories/invitation.repository';
import { FleetMemberRepository } from '@/repositories/fleet-member.repository';

// Instances singleton des services et repositories
const invitationRepository = new InvitationRepository();
const fleetMemberRepository = new FleetMemberRepository();
const invitationService = new InvitationService(invitationRepository, fleetMemberRepository);

// Réexporter les types pour compatibilité
export interface FleetInvitation {
  id: string;
  fleet_id: string;
  code: string;
  expires_at: string | null;
  max_uses: number | null;
  current_uses: number;
  created_by: string;
  created_at: string;
  // Joined data
  fleet?: {
    id: string;
    name: string;
  } | null;
  creator?: {
    user_id: string;
    full_name: string | null;
  } | null;
}

export interface InvitationInsert {
  fleet_id: string;
  code: string;
  expires_at?: string | null;
  max_uses?: number | null;
}

export function useInvitations(fleetId?: string) {
  return useQuery({
    queryKey: ['invitations', fleetId],
    queryFn: () => invitationService.getInvitations(fleetId),
    enabled: !!fleetId,
  });
}

export function useCreateInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitation: InvitationInsert) => {
      return invitationService.createInvitation(invitation);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invitations', variables.fleet_id] });
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      toast({
        title: 'Invitation créée',
        description: 'L\'invitation a été créée avec succès.',
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

export function useDeleteInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ invitationId, fleetId }: { invitationId: string; fleetId: string }) => {
      await invitationService.deleteInvitation(invitationId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invitations', variables.fleetId] });
      toast({
        title: 'Invitation supprimée',
        description: 'L\'invitation a été supprimée avec succès.',
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
