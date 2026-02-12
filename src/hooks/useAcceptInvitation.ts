import { supabase } from '@/integrations/supabase/client';
import { InvitationService } from '@/services/invitation.service';
import { InvitationRepository } from '@/repositories/invitation.repository';
import { FleetMemberRepository } from '@/repositories/fleet-member.repository';
import type { AcceptInvitationResult } from '@/services/invitation.service';

const invitationRepository = new InvitationRepository();
const fleetMemberRepository = new FleetMemberRepository();
const invitationService = new InvitationService(invitationRepository, fleetMemberRepository);

export type { AcceptInvitationResult };

/**
 * Accepte une invitation par code. Délègue au service (pas d'appel direct Supabase dans le hook).
 */
export async function acceptInvitation(code: string): Promise<AcceptInvitationResult> {
  return invitationService.acceptInvitation(code);
}

/**
 * Retourne le code d'invitation en attente depuis les métadonnées utilisateur si aucune adhésion existante.
 * Seul auth.getUser() reste dans le hook (exception documentée) ; la vérification d'adhésion passe par le service.
 */
export async function checkPendingInvitation(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return invitationService.checkPendingInvitation(user.id, {
    invitation_code: user.user_metadata?.invitation_code,
    invitation_fleet_id: user.user_metadata?.invitation_fleet_id,
  });
}
