import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import FleetVehiclesListPage from "@/features/fleet/screens/FleetVehiclesListPage";
import { createQueryClientWrapper } from "@/test/utils";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    userFleetId: "fleet-1",
    isLoading: false,
  }),
}));

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({
    canWriteFleet: true,
  }),
}));

vi.mock("@/hooks/useRoleAccess", () => ({
  useRoleAccess: () => ({
    can: (perm: string) => perm === "vehicle.assign_driver",
  }),
}));

vi.mock("@/hooks/useVehicles", () => ({
  useVehicleList: () => ({
    data: [
      {
        id: "v1",
        fleet_id: "fleet-1",
        registration: "CE-071-OL",
        brand: "Toyota",
        model: "Verso",
        year: 2020,
        current_km: 45000,
        status: "ok",
        blocked_reason: null,
        created_at: "2026-01-01T00:00:00.000Z",
        active_assignment: null,
        next_maintenance_at: null,
      },
    ],
    isLoading: false,
    error: null,
  }),
}));

vi.mock("@/components/vehicles/VehicleFormDialog", () => ({
  default: () => null,
}));

vi.mock("@/components/vehicles/AssignmentFormDialog", () => ({
  AssignmentFormDialog: () => null,
}));

describe("FleetVehiclesListPage", () => {
  it("affiche le bouton d'affectation chauffeur sur une carte véhicule", () => {
    const Wrapper = createQueryClientWrapper();
    render(
      <Wrapper>
        <MemoryRouter>
          <FleetVehiclesListPage />
        </MemoryRouter>
      </Wrapper>,
    );

    expect(screen.getByText("CE-071-OL")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Affecter un chauffeur/i })).toBeInTheDocument();
    expect(screen.getByText("Non assigné")).toBeInTheDocument();
  });
});
