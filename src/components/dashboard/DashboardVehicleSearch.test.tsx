import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { DashboardVehicleSearch } from "./DashboardVehicleSearch";

const { navigateMock, vehicleSearchMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  vehicleSearchMock: vi.fn(),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("@/hooks/useVehicleSearch", () => ({
  useVehicleSearch: () => vehicleSearchMock(),
}));

function renderSearch() {
  return render(
    <MemoryRouter>
      <DashboardVehicleSearch fleetId="fleet-1" />
    </MemoryRouter>,
  );
}

describe("DashboardVehicleSearch", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    vehicleSearchMock.mockReturnValue({
      filters: {
        query: "AB",
        status: new Set(),
        maint: new Set(),
        alert: new Set(),
        sortBy: "similarity",
      },
      results: [
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
        },
      ],
      loading: false,
      loadingMore: false,
      hasMore: false,
      hasFilters: false,
      setQuery: vi.fn(),
      toggleFilter: vi.fn(),
      setSort: vi.fn(),
      nextPage: vi.fn(),
      reset: vi.fn(),
    });
  });

  it("navigue vers la fiche vehicule sans recharger l'application quand Entree valide le resultat selectionne", () => {
    renderSearch();

    const input = screen.getByPlaceholderText("Plaque, marque, conducteur...");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(navigateMock).toHaveBeenCalledWith("/dashboard/vehicles/veh-1");
  });
});
