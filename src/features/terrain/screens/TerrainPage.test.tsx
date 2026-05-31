import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import TerrainPage from "@/features/terrain/screens/TerrainPage";

const startShiftMutate = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "driver-1" },
    userFleetId: "fleet-1",
  }),
}));

vi.mock("@/hooks/useAssignments", () => ({
  useActiveAssignments: () => ({
    data: [
      {
        id: "assign-1",
        fleet_id: "fleet-1",
        vehicle_id: "v1",
        driver_user_id: "driver-1",
        starts_at: "2026-05-31T08:00:00.000Z",
        ends_at: null,
        is_active: true,
        created_by: "mgr-1",
        created_at: "2026-05-31T08:00:00.000Z",
        vehicle: { id: "v1", registration: "CE-071-OL", brand: "Toyota", model: "Verso" },
      },
    ],
    isPending: false,
  }),
}));

vi.mock("@/hooks/useDriverShifts", () => ({
  useActiveShift: () => ({
    data: null,
    isPending: false,
  }),
  useStartShift: () => ({
    mutate: startShiftMutate,
    isPending: false,
  }),
}));

vi.mock("@/hooks/usePlannedShifts", () => ({
  useUpcomingPlannedShift: () => ({
    data: null,
    isPending: false,
  }),
}));

vi.mock("@/hooks/useFuel", () => ({
  useCreateFuelEntry: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

describe("TerrainPage", () => {
  it("ouvre un créneau après saisie du km départ", () => {
    render(
      <MemoryRouter>
        <TerrainPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/Kilométrage départ/i), {
      target: { value: "45230" },
    });

    const openButton = screen.getByRole("button", { name: /Ouvrir créneau/i });
    expect(openButton).not.toBeDisabled();

    fireEvent.click(openButton);

    expect(startShiftMutate).toHaveBeenCalledWith({
      assignment_id: "assign-1",
      km_start: 45230,
    });
  });
});
