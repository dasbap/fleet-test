import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DvirInspectionsPage from "@/features/inspections/screens/DvirInspectionsPage";

const mutateAsyncMock = vi.fn().mockResolvedValue(undefined);

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ userFleetId: "fleet-1" }),
}));

vi.mock("@/hooks/useVehicles", () => ({
  useVehiclesSimple: () => ({
    data: [{ id: "veh-1", registration: "AB-123-CD" }],
  }),
}));

vi.mock("@/hooks/useDvir", () => ({
  useDvirList: () => ({
    data: [
      {
        id: "dvir-1",
        vehicle_registration: "AB-123-CD",
        inspected_at: new Date().toISOString(),
        overall_status: "ok",
      },
    ],
    isLoading: false,
  }),
  useDvirChecklistConfig: () => ({
    data: [
      { slug: "freins_service" },
      { slug: "frein_main" },
      { slug: "direction" },
      { slug: "pneus" },
    ],
  }),
  useCreateDvir: () => ({
    mutateAsync: mutateAsyncMock,
    isPending: false,
  }),
}));

describe("DvirInspectionsPage", () => {
  it("affiche la liste et soumet un contrôle rapide", async () => {
    render(
      <MemoryRouter>
        <DvirInspectionsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Inspections DVIR")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Nouvelle inspection complète (15 points)" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("AB-123-CD").length).toBeGreaterThan(0);

    fireEvent.change(screen.getByDisplayValue("Sélectionner un véhicule"), {
      target: { value: "veh-1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(mutateAsyncMock).toHaveBeenCalledTimes(1);
  });
});
