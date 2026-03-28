/**
 * Tests unitaires pour useAcceptInvitation
 * Vérifie l’interprétation du retour RPC accepter_invitation (objet, tableau, erreur).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { User } from "@supabase/supabase-js";
import { acceptInvitation, checkPendingInvitation } from "./useAcceptInvitation";

const rpcMock = vi.fn();
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
const fromMock = vi.fn((_table?: string) => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
    from: (table: string) => fromMock(table),
  },
}));

function mockUser(partial: Partial<User> & { id: string }): User {
  return partial as User;
}

describe("useAcceptInvitation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

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
      const maybeSingleMock = vi.fn().mockResolvedValue({ data: null });
      fromMock.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: maybeSingleMock,
      });

      const code = await checkPendingInvitation(
        mockUser({
          id: "user-1",
          user_metadata: { invitation_code: "INV-ABC", invitation_fleet_id: "fleet-1" },
        }),
      );

      expect(code).toBe("INV-ABC");
    });

    it("retourne null si l'utilisateur a déjà un membership pour la flotte d'invitation", async () => {
      const maybeSingleMock = vi.fn().mockResolvedValue({ data: { id: "membership-1" } });
      fromMock.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: maybeSingleMock,
      });

      const code = await checkPendingInvitation(
        mockUser({
          id: "user-1",
          user_metadata: { invitation_code: "INV-X", invitation_fleet_id: "fleet-1" },
        }),
      );

      expect(code).toBeNull();
    });

    it("retourne null si invitation_code présent mais invitation_fleet_id absent", async () => {
      const code = await checkPendingInvitation(
        mockUser({
          id: "user-1",
          user_metadata: { invitation_code: "INV-PARTIAL" },
        }),
      );

      expect(code).toBeNull();
      expect(fromMock).not.toHaveBeenCalled();
    });

    it("retourne null si user_metadata absent ou vide", async () => {
      const code = await checkPendingInvitation(
        mockUser({
          id: "user-1",
          user_metadata: {},
        }),
      );

      expect(code).toBeNull();
      expect(fromMock).not.toHaveBeenCalled();
    });
  });
});
