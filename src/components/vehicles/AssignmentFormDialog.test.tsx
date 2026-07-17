import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AssignmentFormDialog } from "@/components/vehicles/AssignmentFormDialog";

const mutateAsyncMock = vi.fn().mockResolvedValue(undefined);
let driverPhone: string | null = "+237600000000";

vi.mock("@/hooks/useVehicles", () => ({
  useVehiclesSimple: () => ({
    data: [
      {
        id: "vehicle-1",
        registration: "LT-001-AA",
        brand: "Toyota",
        model: "Hilux",
        status: "ok",
      },
    ],
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useAssignments", () => ({
  useFleetDrivers: () => ({
    data: [
      {
        user_id: "driver-1",
        full_name: "Conducteur Test",
        phone: driverPhone,
        role: "driver",
        is_active: true,
      },
    ],
    isLoading: false,
  }),
  useAssignVehicle: () => ({
    mutateAsync: mutateAsyncMock,
    isPending: false,
  }),
}));

function renderDialog() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AssignmentFormDialog
          open
          onOpenChange={() => undefined}
          fleetId="fleet-1"
        />
      </BrowserRouter>
    </QueryClientProvider>,
  );
}

describe("AssignmentFormDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    driverPhone = "+237600000000";
  });

  it("garde les selects controles pendant l'affectation", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    renderDialog();

    fireEvent.click(screen.getByLabelText(/S.lectionner un v.hicule/i));
    fireEvent.click(screen.getAllByText(/LT-001-AA/).at(-1)!);
    fireEvent.click(screen.getByLabelText(/S.lectionner un chauffeur/i));
    fireEvent.click(screen.getAllByText("Conducteur Test (+237600000000)").at(-1)!);

    expect(
      warnSpy.mock.calls.some((call) =>
        call.some(
          (part) =>
            typeof part === "string" &&
            part.includes("Select is changing from uncontrolled to controlled"),
        ),
      ),
    ).toBe(false);

    warnSpy.mockRestore();
  });

  it("permet d'affecter un chauffeur sans numero de telephone", async () => {
    driverPhone = null;

    renderDialog();

    fireEvent.click(screen.getByLabelText(/S.lectionner un v.hicule/i));
    fireEvent.click(screen.getAllByText(/LT-001-AA/).at(-1)!);
    fireEvent.click(screen.getByLabelText(/S.lectionner un chauffeur/i));
    fireEvent.click(screen.getAllByText("Conducteur Test").at(-1)!);
    fireEvent.click(screen.getByRole("button", { name: /Affecter/i }));

    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledWith({
        fleet_id: "fleet-1",
        vehicle_id: "vehicle-1",
        driver_user_id: "driver-1",
      });
    });
  });
});
