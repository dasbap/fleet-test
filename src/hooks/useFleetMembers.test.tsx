/**
 * Tests unitaires pour useFleetMembers, useAddFleetMember, useUpdateMemberRole, useRemoveFleetMember.
 *
 * Flux de chaînage Supabase mockée :
 * - findAll : from().select().order().eq() → eq résout
 * - ajout : rpc("ajouter_membre_par_email", ...) mocké
 * - update : from().update().eq().select().single() → single résout
 * - removeMember : findById (from().select().eq().single()) puis update (from().update().eq().select().single())
 *
 * Respect de l'architecture : hooks → services → repositories → Supabase.
 * Les tests mockent la chaîne Supabase (jamais d'appel direct dans le hook).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import {
  useFleetMembers,
  useAddFleetMember,
  useUpdateMemberRole,
  useRemoveFleetMember,
} from "./useFleetMembers";
import { createQueryClientWrapper } from "@/test/utils";

const fromChain = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  single: vi.fn(),
};
const fromMock = vi.fn((_table?: string) => fromChain);
const rpcMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => fromMock(table),
    rpc: (name: string, args: unknown) => rpcMock(name, args),
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

vi.mock("@/lib/mapSupabaseError", () => ({
  mapSupabaseErrorToFrench: (msg: string) => msg,
}));

function resetFromChainForFindAll() {
  fromChain.select.mockReturnValue(fromChain);
  fromChain.order.mockReturnValue(fromChain);
  fromChain.eq.mockReturnValue(fromChain);
}

function resetFromChainForUpdate() {
  fromChain.update.mockReturnValue(fromChain);
  fromChain.eq.mockReturnValue(fromChain);
  fromChain.select.mockReturnValue(fromChain);
}

describe("useFleetMembers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFromChainForFindAll();
  });

  it("ne lance pas la requête si fleetId est undefined", async () => {
    const { result } = renderHook(() => useFleetMembers(undefined), {
      wrapper: createQueryClientWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isFetching).toBe(false);
    });
    expect(result.current.data).toBeUndefined();
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("retourne la liste des membres pour un fleetId donné", async () => {
    const members = [
      {
        id: "m1",
        user_id: "u1",
        role: "driver",
        is_active: true,
        created_at: "2025-01-01T00:00:00Z",
        profile: { full_name: "Jean Dupont", phone: null },
      },
    ];
    // Dernière méthode de la chaîne findAll : .eq('fleet_id', id) ; c'est elle qui doit résoudre
    fromChain.eq.mockResolvedValueOnce({ data: members, error: null });

    const { result } = renderHook(() => useFleetMembers("fleet-1"), {
      wrapper: createQueryClientWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data).toBeDefined();
    expect(result.current.data?.length).toBe(1);
    expect(fromMock).toHaveBeenCalledWith("flotte_adhesions");
    expect(fromChain.eq).toHaveBeenCalledWith("fleet_id", "fleet-1");
  });

  it("throw en cas d'erreur Supabase", async () => {
    fromChain.eq.mockResolvedValueOnce({
      data: null,
      error: { message: "Permission denied" },
    });

    const { result } = renderHook(() => useFleetMembers("fleet-1"), {
      wrapper: createQueryClientWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error).toBeDefined();
  });
});

describe("useAddFleetMember", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rpcMock.mockResolvedValue({ data: "new-membership-id", error: null });
  });

  it("appelle la RPC ajouter_membre_par_email avec les bons paramètres", async () => {
    const { result } = renderHook(() => useAddFleetMember(), {
      wrapper: createQueryClientWrapper(),
    });

    result.current.mutate({
      fleetId: "fleet-1",
      data: { email: "user@example.com", role: "driver" },
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(rpcMock).toHaveBeenCalledWith("ajouter_membre_par_email", {
      p_fleet_id: "fleet-1",
      p_email: "user@example.com",
      p_role: "driver",
    });
  });

  it("throw avec message adapté quand l'utilisateur n'existe pas", async () => {
    rpcMock.mockResolvedValueOnce({
      data: null,
      error: { message: "User not found" },
    });

    const { result } = renderHook(() => useAddFleetMember(), {
      wrapper: createQueryClientWrapper(),
    });

    result.current.mutate({
      fleetId: "fleet-1",
      data: { email: "unknown@example.com", role: "driver" },
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error?.message).toMatch(/aucun utilisateur|créer un compte/i);
  });
});

describe("useUpdateMemberRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rpcMock.mockResolvedValue({ data: "updated-membership-id", error: null });
  });

  it("appelle la RPC creer_ou_mettre_a_jour_adhesion_flotte", async () => {
    const { result } = renderHook(() => useUpdateMemberRole(), {
      wrapper: createQueryClientWrapper(),
    });

    result.current.mutate({
      membershipId: "m1",
      fleetId: "fleet-1",
      userId: "u1",
      role: "manager",
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(rpcMock).toHaveBeenCalledWith("creer_ou_mettre_a_jour_adhesion_flotte", {
      p_fleet_id: "fleet-1",
      p_user_id: "u1",
      p_role: "manager",
      p_is_active: true,
    });
  });

  it("throw quand la RPC renvoie une erreur", async () => {
    rpcMock.mockResolvedValueOnce({
      data: null,
      error: { message: "Permission denied" },
    });

    const { result } = renderHook(() => useUpdateMemberRole(), {
      wrapper: createQueryClientWrapper(),
    });

    result.current.mutate({
      membershipId: "m1",
      fleetId: "fleet-1",
      userId: "u1",
      role: "manager",
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error?.message).toBeDefined();
  });
});

describe("useRemoveFleetMember", () => {
  const updatedMember = {
    id: "m1",
    user_id: "u1",
    fleet_id: "fleet-1",
    role: "driver",
    is_active: false,
    created_at: "2025-01-01T00:00:00Z",
    profile: { full_name: "Jean", phone: null },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetFromChainForUpdate();
  });

  it("met à jour flotte_adhesions avec is_active: false", async () => {
    // removeMember : findById puis update ; chaque appel utilise .single()
    const memberForFind = { ...updatedMember, is_active: true };
    fromChain.single
      .mockResolvedValueOnce({ data: memberForFind, error: null })
      .mockResolvedValueOnce({ data: updatedMember, error: null });

    const { result } = renderHook(() => useRemoveFleetMember(), {
      wrapper: createQueryClientWrapper(),
    });

    result.current.mutate({ membershipId: "m1", fleetId: "fleet-1" });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(fromMock).toHaveBeenCalledWith("flotte_adhesions");
    expect(fromChain.update).toHaveBeenCalledWith({ is_active: false });
    expect(fromChain.eq).toHaveBeenCalledWith("id", "m1");
  });

  it("throw quand l'UPDATE échoue", async () => {
    // removeMember appelle findById puis update : 1) findById doit réussir
    const memberForFindById = { ...updatedMember, is_active: true };
    fromChain.single.mockResolvedValueOnce({ data: memberForFindById, error: null });
    // 2) update doit échouer
    fromChain.single.mockResolvedValueOnce({
      data: null,
      error: { message: "RLS policy violation" },
    });

    const { result } = renderHook(() => useRemoveFleetMember(), {
      wrapper: createQueryClientWrapper(),
    });

    result.current.mutate({ membershipId: "m1", fleetId: "fleet-1" });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error?.message).toBeDefined();
  });
});
