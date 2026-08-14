import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FleetVehiclesListPage from "@/features/fleet/screens/FleetVehiclesListPage";
import { createQueryClientWrapper } from "@/test/utils";

const endAssignmentMock = vi.fn();
let vehicleStatus = "ok";
let activeAssignment: unknown = null;

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
    can: (perm: string) => perm === "vehicle.assign_driver" || perm === "billing.manage",
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
        status: vehicleStatus,
        blocked_reason: null,
        created_at: "2026-01-01T00:00:00.000Z",
        active_assignment: activeAssignment,
        next_maintenance_at: null,
      },
    ],
    isLoading: false,
    error: null,
  }),
}));

vi.mock("@/hooks/useSubscriptionManagement", () => ({
  useFleetSubscriptions: () => ({
    data: [
      {
        id: "sub-1",
        status: "active",
        planName: "Pro",
        planCode: "pro",
        vehicleCount: 1,
        vehicleCapacity: 2,
        availableSlots: 1,
        vehicles: [{ id: "v1", registration: "CE-071-OL" }],
      },
      {
        id: "sub-2",
        status: "active",
        planName: "Pro",
        planCode: "pro",
        vehicleCount: 0,
        vehicleCapacity: 1,
        availableSlots: 1,
        vehicles: [],
      },
    ],
    isLoading: false,
  }),
  useTransferVehicleSubscription: () => ({
    isPending: false,
    mutateAsync: vi.fn(),
  }),
}));

vi.mock("@/components/vehicles/VehicleFormDialog", () => ({
  default: () => null,
}));

vi.mock("@/components/vehicles/AssignmentFormDialog", () => ({
  AssignmentFormDialog: () => null,
}));

vi.mock("@/hooks/useAssignments", () => ({
  useEndAssignment: () => ({
    isPending: false,
    mutateAsync: endAssignmentMock,
  }),
}));

describe("FleetVehiclesListPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vehicleStatus = "ok";
    activeAssignment = null;
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

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
    expect(screen.getByRole("combobox", { name: /Abonnement du vehicule CE-071-OL/i })).toBeInTheDocument();
    expect(screen.getByText("Non assigné")).toBeInTheDocument();
  });
  it("permet de retirer le chauffeur meme si le vehicule est bloque", () => {
    vehicleStatus = "blocked";
    activeAssignment = {
      id: "assignment-1",
      driver_user_id: "driver-1",
      driver: { user_id: "driver-1", full_name: "Chauffeur Test" },
    };

    const Wrapper = createQueryClientWrapper();
    render(
      <Wrapper>
        <MemoryRouter>
          <FleetVehiclesListPage />
        </MemoryRouter>
      </Wrapper>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Retirer le chauffeur/i }));

    expect(window.confirm).toHaveBeenCalledWith("Retirer Chauffeur Test de ce vehicule ?");
    expect(endAssignmentMock).toHaveBeenCalledWith("assignment-1");
  });
});
