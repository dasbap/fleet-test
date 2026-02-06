import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
    queryFn: async () => {
      let query = supabase
        .from('flotte_invitations')
        .select(`
          *,
          fleet:flottes(id, name)
        `)
        .order('created_at', { ascending: false });

      if (fleetId) {
        query = query.eq('fleet_id', fleetId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching invitations:', error);
        throw new Error(error.message);
      }

      return (data || []) as FleetInvitation[];
    },
    enabled: !!fleetId,
  });
}

export function useCreateInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitation: InvitationInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const { data, error } = await supabase
        .from('flotte_invitations')
        .insert({
          ...invitation,
          created_by: user.id,
        })
        .select(`
          *,
          fleet:flottes(id, name)
        `)
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('Ce code d\'invitation existe déjà. Veuillez en choisir un autre.');
        }
        throw new Error(error.message);
      }

      return data as FleetInvitation;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invitations', variables.fleet_id] });
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
      const { error } = await supabase
        .from('flotte_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) {
        throw new Error(error.message);
      }
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
