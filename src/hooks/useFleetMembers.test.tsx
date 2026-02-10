/**
 * Tests unitaires pour useFleetMembers, useAddFleetMember, useUpdateMemberRole, useRemoveFleetMember
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useFleetMembers,
  useAddFleetMember,
  useUpdateMemberRole,
  useRemoveFleetMember,
} from "./useFleetMembers";
import type { ReactNode } from "react";

const fromChain = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  single: vi.fn(),
};
const fromMock = vi.fn(() => fromChain);
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

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe("useFleetMembers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fromChain.select.mockReturnValue(fromChain);
    fromChain.order.mockReturnValue(fromChain);
    fromChain.eq.mockReturnValue(fromChain);
  });

  it("ne lance pas la requête si fleetId est undefined", async () => {
    const { result } = renderHook(() => useFleetMembers(undefined), {
      wrapper: createWrapper(),
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
      wrapper: createWrapper(),
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
      wrapper: createWrapper(),
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
      wrapper: createWrapper(),
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
      wrapper: createWrapper(),
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
      wrapper: createWrapper(),
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
      wrapper: createWrapper(),
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
    fromChain.update.mockReturnValue(fromChain);
    fromChain.eq.mockReturnValue(fromChain);
    fromChain.select.mockReturnValue(fromChain);
  });

  it("met à jour flotte_adhesions avec is_active: false", async () => {
    // Chaîne update : .update().eq().select().single() ; c'est single() qui doit résoudre
    fromChain.single.mockResolvedValue({ data: updatedMember, error: null });

    const { result } = renderHook(() => useRemoveFleetMember(), {
      wrapper: createWrapper(),
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
    fromChain.single.mockResolvedValue({
      data: null,
      error: { message: "RLS policy violation" },
    });

    const { result } = renderHook(() => useRemoveFleetMember(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ membershipId: "m1", fleetId: "fleet-1" });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error?.message).toBeDefined();
  });
});
