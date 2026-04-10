import { useMutation } from "@tanstack/react-query";
import { InvitationService } from "@/services/invitation.service";
import { InvitationRepository } from "@/repositories/invitation.repository";
import { FleetMemberRepository } from "@/repositories/fleet-member.repository";

const invitationRepository = new InvitationRepository();
const fleetMemberRepository = new FleetMemberRepository();
const invitationService = new InvitationService(invitationRepository, fleetMemberRepository);

export function useInvitationCodeValidation() {
  return useMutation({
    mutationFn: async (code: string) => invitationService.validateInvitationCode(code),
  });
}
