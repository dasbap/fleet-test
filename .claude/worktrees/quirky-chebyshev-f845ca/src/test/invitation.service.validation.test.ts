import { describe, expect, it, vi } from "vitest";
import { InvitationService } from "@/services/invitation.service";
import type { InvitationRepository } from "@/repositories/invitation.repository";
import type { FleetMemberRepository } from "@/repositories/fleet-member.repository";

function createInvitationRepositoryMock() {
  return {
    findValidationByCode: vi.fn(),
  };
}

describe("InvitationService.validateInvitationCode", () => {
  it("retourne not_found quand le code est introuvable", async () => {
    const invitationRepo = createInvitationRepositoryMock();
    invitationRepo.findValidationByCode.mockResolvedValue(null);
    const fleetMemberRepo = {} as FleetMemberRepository;
    const service = new InvitationService(
      invitationRepo as unknown as InvitationRepository,
      fleetMemberRepo
    );

    const result = await service.validateInvitationCode("abc123");

    expect(result).toEqual({ status: "invalid", reason: "not_found" });
    expect(invitationRepo.findValidationByCode).toHaveBeenCalledWith("ABC123");
  });

  it("retourne valid quand le code est utilisable", async () => {
    const invitationRepo = createInvitationRepositoryMock();
    invitationRepo.findValidationByCode.mockResolvedValue({
      id: "inv-1",
      fleet_id: "fleet-1",
      expires_at: null,
      max_uses: 10,
      current_uses: 2,
      fleet: { name: "Flotte Test" },
    });
    const fleetMemberRepo = {} as FleetMemberRepository;
    const service = new InvitationService(
      invitationRepo as unknown as InvitationRepository,
      fleetMemberRepo
    );

    const result = await service.validateInvitationCode("abc123");

    expect(result).toEqual({
      status: "valid",
      fleetId: "fleet-1",
      fleetName: "Flotte Test",
      code: "ABC123",
    });
  });
});
