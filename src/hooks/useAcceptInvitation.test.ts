/**
 * Tests unitaires pour useAcceptInvitation
 * Vérifie l’interprétation du retour RPC accepter_invitation (objet, tableau, erreur).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { User } from "@supabase/supabase-js";
import { acceptInvitation, checkPendingInvitation } from "./useAcceptInvitation";

const rpcMock = vi.fn();
const findActiveMembershipMock = vi.fn();

vi.mock("@/repositories/fleet-member.repository", () => ({
  FleetMemberRepository: vi.fn().mockImplementation(() => ({
    findActiveMembershipByUserAndFleet: (...args: unknown[]) =>
      findActiveMembershipMock(...args),
  })),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
  },
}));

function mockUser(partial: Partial<User> & { id: string }): User {
  return partial as User;
}

describe("useAcceptInvitation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findActiveMembershipMock.mockResolvedValue(null);
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  afterEach(() => {
    consoleErrorSpy?.mockRestore();
  });

  describe("acceptInvitation", () => {
    it("retourne le résultat quand la RPC renvoie un objet avec ok: true", async () => {
      rpcMock.mockResolvedValue({
        data: { ok: true, fleet_id: "f1", membership_id: "m1" },
        error: null,
      });

      const result = await acceptInvitation("CODE1");

      expect(result.ok).toBe(true);
      expect(result.fleet_id).toBe("f1");
      expect(rpcMock).toHaveBeenCalled();
    });

    it("retourne le résultat quand la RPC renvoie un tableau avec un objet ok", async () => {
      rpcMock.mockResolvedValue({
        data: [{ ok: true, fleet_id: "f2", membership_id: "m2" }],
        error: null,
      });

      const result = await acceptInvitation("CODE2");

      expect(result.ok).toBe(true);
      expect(result.fleet_id).toBe("f2");
    });

    it("retourne erreur quand la RPC renvoie une erreur", async () => {
      rpcMock.mockResolvedValue({
        data: null,
        error: { message: "invalid_code" },
      });

      const result = await acceptInvitation("BAD");

      expect(result.ok).toBe(false);
      expect(result.error).toBe("invalid_code");
    });

    it("retourne le résultat depuis un objet unique dans data", async () => {
      rpcMock.mockResolvedValue({
        data: { ok: true, fleet_id: "f3", membership_id: "m3" },
        error: null,
      });

      const result = await acceptInvitation("CODE4");

      expect(result.ok).toBe(true);
      expect(result.fleet_id).toBe("f3");
    });

    it("retourne unexpected_error en cas d'exception", async () => {
      rpcMock.mockRejectedValue(new Error("Network error"));

      const result = await acceptInvitation("CODE5");

      expect(result).toEqual({ ok: false, error: "unexpected_error" });
    });
  });

  describe("checkPendingInvitation", () => {
    it("retourne null si pas d'utilisateur", async () => {
      const code = await checkPendingInvitation(null);

      expect(code).toBeNull();
    });

    it("retourne le code d'invitation si metadata présente et pas encore de membership", async () => {
      findActiveMembershipMock.mockResolvedValueOnce(null);

      const code = await checkPendingInvitation(
        mockUser({
          id: "user-1",
          user_metadata: { invitation_code: "INV-ABC", invitation_fleet_id: "fleet-1" },
        }),
      );

      expect(code).toBe("INV-ABC");
      expect(findActiveMembershipMock).toHaveBeenCalledWith("user-1", "fleet-1");
    });

    it("retourne null si l'utilisateur a déjà un membership pour la flotte d'invitation", async () => {
      findActiveMembershipMock.mockResolvedValueOnce({
        id: "m1",
        user_id: "user-1",
        fleet_id: "fleet-1",
        role: "driver",
        is_active: true,
      });

      const code = await checkPendingInvitation(
        mockUser({
          id: "user-1",
          user_metadata: { invitation_code: "INV-ABC", invitation_fleet_id: "fleet-1" },
        }),
      );

      expect(code).toBeNull();
    });
  });
});
