import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useVehicleSearch } from "./useVehicleSearch";
import { createQueryClientWrapper } from "@/test/utils";

const { rpcMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: rpcMock,
  },
}));

describe("useVehicleSearch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("n'exécute pas la requête si fleetId est absent", async () => {
    const { result } = renderHook(() => useVehicleSearch(null), {
      wrapper: createQueryClientWrapper(),
    });

    act(() => {
      result.current.setQuery("AB-123");
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 250));
    });

    expect(rpcMock).not.toHaveBeenCalled();
    expect(result.current.results).toEqual([]);
  });

  it("exécute la requête avec query active et retourne les résultats", async () => {
    rpcMock.mockResolvedValueOnce({
      data: [
        {
          id: "veh-1",
          fleet_id: "fleet-1",
          plate: "AB-123-CD",
          brand: "Toyota",
          model: "Hilux",
          driver_name: "Jean",
          km: 12000,
          status: "active",
          pending_maint_type: null,
          alert_severity: null,
          alert_rank: 4,
          search_text: "AB-123-CD Toyota Hilux Jean",
          similarity: 0.72,
          total_count: 1,
        },
      ],
      error: null,
    });

    const { result } = renderHook(() => useVehicleSearch("fleet-1"), {
      wrapper: createQueryClientWrapper(),
    });

    act(() => {
      result.current.setQuery("AB-123");
    });

    await waitFor(
      () => {
        expect(result.current.results.length).toBe(1);
      },
      { timeout: 2000 },
    );
  });
});
