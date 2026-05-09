/**
 * Tests unitaires pour les hooks useInvitations, useCreateInvitation, useDeleteInvitation
 *
 * But de l'examen : vérifier chaque comportement business et l'isolation des couches
 * (hooks → services → repositories) selon l’architecture en couches prescrite.
 *
 * - Les hooks ne doivent jamais appeler Supabase directement, mais seulement les services.
 * - Les services encapsulent la logique métier et dépendent d’un repository pour tous les accès Supabase.
 * - Les repositories sont responsables des requêtes Supabase et du typage strict des retours.
 *
 * Flux de chaîne Supabase mockée :
 * - findAll : from().select().order().eq() → eq résout
 * - create : from().insert().select().single() → single résout
 * - delete : findById (from().select().eq().single) puis from().delete().eq() → eq résout
 *
 * Les tests couvrent :
 *   - Lecture d’invitations (useInvitations)
 *   - Création d’invitation (useCreateInvitation)
 *   - Suppression d’invitation (useDeleteInvitation)
 *
 * Veiller à la conformité complète : aucun accès direct à Supabase depuis les hooks.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useInvitations, useCreateInvitation, useDeleteInvitation } from "./useInvitations";
import { createQueryClientWrapper } from "@/test/utils";
import { toast } from "@/hooks/use-toast";

const fromChain = {
  select: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  single: vi.fn(),
};
const fromMock = vi.fn((_table: string) => fromChain);
const getUserMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => fromMock(table),
    auth: { getUser: () => getUserMock() },
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

describe("useInvitations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    fromChain.select.mockReturnValue(fromChain);
    fromChain.order.mockReturnValue(fromChain);
    fromChain.eq.mockReturnValue(fromChain);
  });

  afterEach(() => {
    consoleErrorSpy?.mockRestore();
  });

  it("ne lance pas la requête si fleetId est undefined", async () => {
    const { result } = renderHook(() => useInvitations(undefined), {
      wrapper: createQueryClientWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isFetching).toBe(false);
    });
    expect(result.current.data).toBeUndefined();
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("retourne la liste des invitations pour un fleetId donné", async () => {
    const invitations = [
      {
        id: "inv-1",
        fleet_id: "f1",
        code: "CODE-A",
        expires_at: null,
        max_uses: null,
        current_uses: 0,
        created_by: "u1",
        created_at: "2025-01-01T00:00:00Z",
        fleet: { id: "f1", name: "Flotte 1" },
      },
    ];
    fromChain.eq.mockResolvedValueOnce({ data: invitations, error: null });

    const { result } = renderHook(() => useInvitations("f1"), {
      wrapper: createQueryClientWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data).toEqual(invitations);
    expect(fromMock).toHaveBeenCalledWith("flotte_invitations");
    expect(fromChain.eq).toHaveBeenCalledWith("fleet_id", "f1");
  });

  it("throw et met isError à true en cas d'erreur Supabase", async () => {
    fromChain.eq.mockResolvedValueOnce({
      data: null,
      error: { message: "Network error" },
    });

    const { result } = renderHook(() => useInvitations("f1"), {
      wrapper: createQueryClientWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error).toBeDefined();
  });
});

describe("useCreateInvitation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    fromChain.insert.mockReturnValue(fromChain);
    fromChain.select.mockReturnValue(fromChain);
    fromChain.single.mockResolvedValue({
      data: {
        id: "inv-new",
        fleet_id: "f1",
        code: "NEW-CODE",
        created_by: "user-1",
      },
      error: null,
    });
  });

  afterEach(() => {
    consoleErrorSpy?.mockRestore();
  });

  it("insère une invitation et invalide les queries", async () => {
    const { result } = renderHook(() => useCreateInvitation(), {
      wrapper: createQueryClientWrapper(),
    });

    result.current.mutate({
      fleet_id: "f1",
      code: "NEW-CODE",
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(fromChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ fleet_id: "f1", code: "NEW-CODE", created_by: "user-1" })
    );
    expect(vi.mocked(toast)).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Invitation créée", description: expect.any(String) })
    );
  });

  it("throw si l'utilisateur n'est pas authentifié", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const { result } = renderHook(() => useCreateInvitation(), {
      wrapper: createQueryClientWrapper(),
    });

    result.current.mutate({ fleet_id: "f1", code: "X" });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error?.message).toContain("authentifié");
  });

  it("throw avec message adapté quand le code d'invitation existe déjà (23505)", async () => {
    fromChain.single.mockResolvedValueOnce({
      data: null,
      error: { code: "23505", message: "duplicate key value" },
    });

    const { result } = renderHook(() => useCreateInvitation(), {
      wrapper: createQueryClientWrapper(),
    });

    result.current.mutate({ fleet_id: "f1", code: "EXISTING-CODE" });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error?.message).toMatch(/existe déjà|choisir un autre/i);
    expect(vi.mocked(toast)).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "destructive" })
    );
  });

  it("throw si fleet_id est manquant", async () => {
    const { result } = renderHook(() => useCreateInvitation(), {
      wrapper: createQueryClientWrapper(),
    });

    result.current.mutate({ fleet_id: "", code: "CODE" });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error?.message).toContain("flotte");
  });

  it("throw si code est vide", async () => {
    const { result } = renderHook(() => useCreateInvitation(), {
      wrapper: createQueryClientWrapper(),
    });

    result.current.mutate({ fleet_id: "f1", code: "   " });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error?.message).toContain("code");
  });

  it("throw si expires_at est dans le passé", async () => {
    const { result } = renderHook(() => useCreateInvitation(), {
      wrapper: createQueryClientWrapper(),
    });

    result.current.mutate({
      fleet_id: "f1",
      code: "X",
      expires_at: "2020-01-01T00:00:00Z",
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error?.message).toContain("passé");
  });

  it("throw si max_uses est inférieur à 1", async () => {
    const { result } = renderHook(() => useCreateInvitation(), {
      wrapper: createQueryClientWrapper(),
    });

    result.current.mutate({ fleet_id: "f1", code: "X", max_uses: 0 });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error?.message).toMatch(/0|supérieur/);
  });
});

describe("useDeleteInvitation", () => {
  const invitationToDelete = {
    id: "inv-1",
    fleet_id: "f1",
    code: "CODE-A",
    expires_at: null,
    max_uses: null,
    current_uses: 0,
    created_by: "u1",
    created_at: "2025-01-01T00:00:00Z",
    fleet: { id: "f1", name: "Flotte 1" },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    fromChain.select.mockReturnValue(fromChain);
    fromChain.order.mockReturnValue(fromChain);
    fromChain.delete.mockReturnValue(fromChain);
    // Service appelle findById puis delete : 1) findById = from().select().eq().single() ; 2) delete = from().delete().eq()
    fromChain.eq
      .mockReturnValueOnce(fromChain)
      .mockResolvedValueOnce({ data: null, error: null });
    fromChain.single.mockResolvedValue({ data: invitationToDelete, error: null });
  });

  afterEach(() => {
    consoleErrorSpy?.mockRestore();
  });

  it("supprime l'invitation par id", async () => {
    const { result } = renderHook(() => useDeleteInvitation(), {
      wrapper: createQueryClientWrapper(),
    });

    await result.current.mutateAsync({ invitationId: "inv-1", fleetId: "f1" });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(fromChain.delete).toHaveBeenCalled();
    expect(fromChain.eq).toHaveBeenCalledWith("id", "inv-1");
  });

  it("throw si l'invitation est introuvable", async () => {
    fromChain.single.mockResolvedValueOnce({
      data: null,
      error: { code: "PGRST116" },
    });

    const { result } = renderHook(() => useDeleteInvitation(), {
      wrapper: createQueryClientWrapper(),
    });

    result.current.mutate({ invitationId: "inv-inexistant", fleetId: "f1" });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error?.message).toContain("introuvable");
    expect(vi.mocked(toast)).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "destructive" })
    );
  });
});
