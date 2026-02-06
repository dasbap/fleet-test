/**
 * Tests unitaires pour useAcceptInvitation
 * Vérifie l'interprétation du retour RPC accepter_invitation (objet, tableau, erreur).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { acceptInvitation, checkPendingInvitation } from "./useAcceptInvitation";

const rpcMock = vi.fn();
const fromMock = vi.fn(() => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn(),
}));
const getUserMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
    auth: {
      getUser: () => getUserMock(),
    },
    from: (table: string) => fromMock(table),
  },
}));

describe("useAcceptInvitation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("acceptInvitation", () => {
    it("retourne le résultat quand la RPC renvoie un objet avec ok: true", async () => {
      rpcMock.mockResolvedValue({
        data: { ok: true, fleet_id: "f1", membership_id: "m1" },
        error: null,
      });

      const result = await acceptInvitation("CODE1");

      expect(result).toEqual({ ok: true, fleet_id: "f1", membership_id: "m1" });
      expect(rpcMock).toHaveBeenCalledWith("accepter_invitation", { p_code: "CODE1" });
    });

    it("retourne ok: false et le message quand la RPC renvoie une erreur", async () => {
      rpcMock.mockResolvedValue({
        data: null,
        error: { message: "invitation_not_found_or_expired" },
      });

      const result = await acceptInvitation("BAD");

      expect(result).toEqual({ ok: false, error: "invitation_not_found_or_expired" });
    });

    it("normalise le retour quand la RPC renvoie un tableau d'un élément", async () => {
      rpcMock.mockResolvedValue({
        data: [{ ok: true, fleet_id: "f2", membership_id: "m2" }],
        error: null,
      });

      const result = await acceptInvitation("CODE2");

      expect(result).toEqual({ ok: true, fleet_id: "f2", membership_id: "m2" });
    });

    it("retourne invalid_response quand data est null ou sans ok", async () => {
      rpcMock.mockResolvedValue({ data: null, error: null });

      const result = await acceptInvitation("CODE3");

      expect(result).toEqual({ ok: false, error: "invalid_response" });
    });

    it("considère already_member comme succès (ok: true)", async () => {
      rpcMock.mockResolvedValue({
        data: { ok: true, fleet_id: "f3", membership_id: "m3", message: "already_member" },
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
      getUserMock.mockResolvedValue({ data: { user: null } });

      const code = await checkPendingInvitation();

      expect(code).toBeNull();
    });

    it("retourne le code d'invitation si metadata présente et pas encore de membership", async () => {
      getUserMock.mockResolvedValue({
        data: {
          user: {
            id: "user-1",
            user_metadata: { invitation_code: "INV-ABC", invitation_fleet_id: "fleet-1" },
          },
        },
      });
      const maybeSingleMock = vi.fn().mockResolvedValue({ data: null });
      fromMock.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: maybeSingleMock,
      });

      const code = await checkPendingInvitation();

      expect(code).toBe("INV-ABC");
    });

    it("retourne null si l'utilisateur a déjà un membership pour la flotte d'invitation", async () => {
      getUserMock.mockResolvedValue({
        data: {
          user: {
            id: "user-1",
            user_metadata: { invitation_code: "INV-X", invitation_fleet_id: "fleet-1" },
          },
        },
      });
      const maybeSingleMock = vi.fn().mockResolvedValue({ data: { id: "membership-1" } });
      fromMock.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: maybeSingleMock,
      });

      const code = await checkPendingInvitation();

      expect(code).toBeNull();
    });
  });
});
