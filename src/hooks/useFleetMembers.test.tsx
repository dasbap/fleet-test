/**
 * Tests unitaires pour useFleetMembers, useAddFleetMember, useUpdateMemberRole, useRemoveFleetMember.
 *
 * Les hooks passent par FleetMemberService (RBAC + RPC). On mock requirePermission et supabase.rpc.
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
import { withConsoleSilenced } from "@/test/withConsoleSilenced";

const rpcMock = vi.fn();

vi.mock("@/lib/rbac/server", () => ({
  requirePermission: vi.fn().mockResolvedValue("organizer"),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (name: string, args: unknown) => rpcMock(name, args),
    from: vi.fn(),
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

vi.mock("@/lib/mapSupabaseError", () => ({
  mapSupabaseErrorToFrench: (msg: string) => msg,
}));

describe("useFleetMembers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("retourne la liste des membres pour un fleetId donné", async () => {
    const rpcRows = [
      {
        id: "m1",
        user_id: "u1",
        fleet_id: "fleet-1",
        role: "driver",
        is_active: true,
        created_at: "2025-01-01T00:00:00Z",
        full_name: "Jean Dupont",
        phone: null,
      },
    ];
    rpcMock.mockResolvedValueOnce({ data: rpcRows, error: null });

    const { result } = renderHook(() => useFleetMembers("fleet-1"), {
      wrapper: createQueryClientWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data).toBeDefined();
    expect(result.current.data?.length).toBe(1);
    expect(rpcMock).toHaveBeenCalledWith("get_fleet_members", { p_fleet_id: "fleet-1" });
  });

  it("throw en cas d'erreur Supabase", async () => {
    await withConsoleSilenced(
      (_method, args) =>
        typeof args[0] === "string" && (args[0] as string).startsWith("Error fetching fleet members via RPC:"),
      async () => {
        rpcMock.mockResolvedValueOnce({
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
      },
    );
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
    await withConsoleSilenced(
      (_method, args) =>
        typeof args[0] === "string" && (args[0] as string).startsWith("Error adding member by email:"),
      async () => {
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
      },
    );
  });
});

describe("useUpdateMemberRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rpcMock.mockResolvedValue({ data: "updated-membership-id", error: null });
  });

  it("appelle la RPC update_fleet_member_role", async () => {
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
    expect(rpcMock).toHaveBeenCalledWith("update_fleet_member_role", {
      p_adhesion_id: "m1",
      p_role: "manager",
    });
  });

  it("throw quand la RPC renvoie une erreur", async () => {
    await withConsoleSilenced(
      (_method, args) =>
        typeof args[0] === "string" &&
        (args[0] as string).startsWith("Error updating member role via RPC:"),
      async () => {
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
      },
    );
  });
});

describe("useRemoveFleetMember", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rpcMock.mockResolvedValue({ data: "m1", error: null });
  });

  it("désactive le membre via creer_ou_mettre_a_jour_adhesion_flotte", async () => {
    const { result } = renderHook(() => useRemoveFleetMember(), {
      wrapper: createQueryClientWrapper(),
    });

    result.current.mutate({
      membershipId: "m1",
      fleetId: "fleet-1",
      userId: "u1",
      role: "driver",
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(rpcMock).toHaveBeenCalledWith("creer_ou_mettre_a_jour_adhesion_flotte", {
      p_fleet_id: "fleet-1",
      p_user_id: "u1",
      p_role: "driver",
      p_is_active: false,
    });
  });

  it("throw quand la RPC échoue", async () => {
    await withConsoleSilenced(
      (_method, args) =>
        typeof args[0] === "string" &&
        (args[0] as string).startsWith("Error upserting membership:"),
      async () => {
        rpcMock.mockResolvedValueOnce({
          data: null,
          error: { message: "Permission denied" },
        });

        const { result } = renderHook(() => useRemoveFleetMember(), {
          wrapper: createQueryClientWrapper(),
        });

        result.current.mutate({
          membershipId: "m1",
          fleetId: "fleet-1",
          userId: "u1",
          role: "driver",
        });

        await waitFor(() => {
          expect(result.current.isError).toBe(true);
        });
      },
    );
  });
});
