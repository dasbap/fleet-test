/**
 * Tests unitaires pour les hooks useInvitations, useCreateInvitation, useDeleteInvitation
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useInvitations, useCreateInvitation, useDeleteInvitation } from "./useInvitations";
import type { ReactNode } from "react";

const fromChain = {
  select: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  single: vi.fn(),
};
const fromMock = vi.fn(() => fromChain);
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

describe("useInvitations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fromChain.select.mockReturnValue(fromChain);
    fromChain.order.mockReturnValue(fromChain);
    fromChain.eq.mockReturnValue(fromChain);
  });

  it("ne lance pas la requête si fleetId est undefined", async () => {
    const { result } = renderHook(() => useInvitations(undefined), {
      wrapper: createWrapper(),
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
      wrapper: createWrapper(),
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
      wrapper: createWrapper(),
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

  it("insère une invitation et invalide les queries", async () => {
    const { result } = renderHook(() => useCreateInvitation(), {
      wrapper: createWrapper(),
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
  });

  it("throw si l'utilisateur n'est pas authentifié", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const { result } = renderHook(() => useCreateInvitation(), {
      wrapper: createWrapper(),
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
      wrapper: createWrapper(),
    });

    result.current.mutate({ fleet_id: "f1", code: "EXISTING-CODE" });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error?.message).toMatch(/existe déjà|choisir un autre/i);
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
    fromChain.select.mockReturnValue(fromChain);
    fromChain.order.mockReturnValue(fromChain);
    fromChain.delete.mockReturnValue(fromChain);
    // Service appelle findById puis delete : 1) findById = from().select().eq().single() ; 2) delete = from().delete().eq()
    fromChain.eq
      .mockReturnValueOnce(fromChain)
      .mockResolvedValueOnce({ data: null, error: null });
    fromChain.single.mockResolvedValue({ data: invitationToDelete, error: null });
  });

  it("supprime l'invitation par id", async () => {
    const { result } = renderHook(() => useDeleteInvitation(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({ invitationId: "inv-1", fleetId: "f1" });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(fromChain.delete).toHaveBeenCalled();
    expect(fromChain.eq).toHaveBeenCalledWith("id", "inv-1");
  });
});
