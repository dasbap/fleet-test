import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import GeofencingPage from "./GeofencingPage";

const createMutate = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    userFleetId: "fleet-1",
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useGeofences", () => ({
  useGeofences: () => ({ data: [], isLoading: false }),
  useGeofenceEvents: () => ({ data: [], isLoading: false }),
  useCreateGeofence: () => ({ mutate: createMutate, isPending: false }),
  useUpdateGeofence: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteGeofence: () => ({ mutate: vi.fn(), isPending: false }),
}));

describe("GeofencingPage", () => {
  it("affiche une erreur visible quand la creation de zone est incomplete", () => {
    render(<GeofencingPage />);

    fireEvent.click(screen.getByRole("button", { name: /nouvelle zone/i }));
    fireEvent.click(screen.getByRole("button", { name: /créer la zone/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(/nom de la zone est requis/i);
    expect(createMutate).not.toHaveBeenCalled();
  });
});
