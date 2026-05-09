import type { User } from "@supabase/supabase-js";
import { InvitationService } from "@/services/invitation.service";
import { InvitationRepository } from "@/repositories/invitation.repository";
import { FleetMemberRepository } from "@/repositories/fleet-member.repository";
import type { AcceptInvitationResult } from "@/services/invitation.service";

const invitationRepository = new InvitationRepository();
const fleetMemberRepository = new FleetMemberRepository();
const invitationService = new InvitationService(invitationRepository, fleetMemberRepository);

export type { AcceptInvitationResult };

/**
 * Accepte une invitation par code (service métier).
 */
export async function acceptInvitation(code: string): Promise<AcceptInvitationResult> {
  return invitationService.acceptInvitation(code);
}

/**
 * Code d’invitation en attente à partir du profil Supabase (pas d’appel auth ici — passer `session.user`).
 */
export async function checkPendingInvitation(sessionUser: User | null): Promise<string | null> {
  if (!sessionUser) return null;
  return invitationService.checkPendingInvitation(sessionUser.id, {
    invitation_code: sessionUser.user_metadata?.invitation_code as string | undefined,
    invitation_fleet_id: sessionUser.user_metadata?.invitation_fleet_id as string | undefined,
  });
}
