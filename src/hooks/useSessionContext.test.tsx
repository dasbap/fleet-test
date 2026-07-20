import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSessionContext } from "@/hooks/useSessionContext";
import type { FlotteContext, ProfilContext } from "@/hooks/useSessionContext";

const mockRpc = vi.fn();
const mockUseAuth = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

function flotte(partial: Partial<FlotteContext> & { fleet_id: string }): FlotteContext {
  return {
    fleet_name: "Flotte A",
    role: "organizer",
    org_id: "org-1",
    org_name: "Org",
    plan_code: "pro",
    plan_name: "Pro",
    abo_status: "active",
    abo_ends_at: "2027-01-01",
    abo_valid: true,
    enables_finance: true,
    enables_ai: false,
    enables_reports: true,
    enables_driver_scoring: false,
    max_vehicles: 50,
    ...partial,
  };
}

describe("useSessionContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      session: { access_token: "t" },
    });
    mockRpc.mockResolvedValue({
      data: {
        route: "dashboard",
        active_fleet_id: "f1",
        profil: {
          user_id: "u1",
          full_name: "Test",
          phone: null,
        } satisfies ProfilContext,
        flottes: [flotte({ fleet_id: "f1" }), flotte({ fleet_id: "f2", fleet_name: "B" })],
      },
      error: null,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sans session : route auth, pas d'erreur RPC", async () => {
    mockUseAuth.mockReturnValue({ session: null });

    const { result } = renderHook(() => useSessionContext());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockRpc).not.toHaveBeenCalled();
    expect(result.current.context.route).toBe("auth");
    expect(result.current.error).toBeNull();
  });

  it("session + RPC OK : currentFleet aligné sur active_fleet_id", async () => {
    const { result } = renderHook(() => useSessionContext());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockRpc).toHaveBeenCalledWith("get_user_session_context");
    expect(result.current.context.route).toBe("dashboard");
    expect(result.current.context.active_fleet_id).toBe("f1");
    expect(result.current.context.currentFleet?.fleet_id).toBe("f1");
    expect(result.current.context.flottes).toHaveLength(2);
    expect(result.current.error).toBeNull();
  });

  it("active_fleet_id absent : currentFleet = première flotte", async () => {
    mockRpc.mockResolvedValue({
      data: {
        route: "start",
        active_fleet_id: null,
        profil: null,
        flottes: [flotte({ fleet_id: "fx" })],
      },
      error: null,
    });

    const { result } = renderHook(() => useSessionContext());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.context.currentFleet?.fleet_id).toBe("fx");
  });

  it("RPC en erreur : message exposé, route auth", async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: new Error("rpc_failed"),
    });

    const { result } = renderHook(() => useSessionContext());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("rpc_failed");
    expect(result.current.context.route).toBe("auth");
  });

  it("setActiveFleet met à jour active_fleet_id et currentFleet", async () => {
    const { result } = renderHook(() => useSessionContext());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setActiveFleet("f2");
    });

    expect(result.current.context.active_fleet_id).toBe("f2");
    expect(result.current.context.currentFleet?.fleet_id).toBe("f2");
  });

  it("perte de session réinitialise vers route auth", async () => {
    const { result, rerender } = renderHook(() => useSessionContext());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.context.route).toBe("dashboard");

    mockUseAuth.mockReturnValue({ session: null });
    rerender();

    await waitFor(() => {
      expect(result.current.context.route).toBe("auth");
    });
  });

  it("nouvelle session déclenche un rechargement RPC", async () => {
    const { result, rerender } = renderHook(() => useSessionContext());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const callsAfterFirst = mockRpc.mock.calls.length;

    mockUseAuth.mockReturnValue({ session: { access_token: "t2" } });
    rerender();

    await waitFor(() => {
      expect(mockRpc.mock.calls.length).toBeGreaterThan(callsAfterFirst);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });
});
