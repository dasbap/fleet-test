import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SubscriptionManagementPanel } from "./SubscriptionManagementPanel";

const activateMutation = vi.fn();

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/hooks/useSubscriptionManagement", () => ({
  useFleetSubscriptions: () => ({
    data: [
      {
        id: "sub-active",
        fleetId: "fleet-1",
        fleetName: "Flotte tuto",
        planId: "plan-pro",
        planCode: "pro",
        planName: "Pro",
        status: "active",
        startsAt: "2026-08-11T00:00:00.000Z",
        endsAt: "2026-09-11T00:00:00.000Z",
        cancelledAt: null,
        vehicleSlots: 2,
        vehicleCapacity: 2,
        vehicleCount: 1,
        availableSlots: 1,
        vehicles: [{ id: "v1", registration: "AA-001", status: "ok" }],
      },
      {
        id: "sub-inactive",
        fleetId: "fleet-1",
        fleetName: "Flotte tuto",
        planId: "plan-starter",
        planCode: "starter",
        planName: "Starter demo",
        status: "inactive",
        startsAt: "2026-08-12T00:00:00.000Z",
        endsAt: "2026-09-12T00:00:00.000Z",
        cancelledAt: null,
        vehicleSlots: 10,
        vehicleCapacity: 10,
        vehicleCount: 0,
        availableSlots: 10,
        vehicles: [],
      },
      {
        id: "sub-cancelled",
        fleetId: "fleet-1",
        fleetName: "Flotte tuto",
        planId: "plan-starter",
        planCode: "starter",
        planName: "Starter",
        status: "cancelled",
        startsAt: "2026-07-01T00:00:00.000Z",
        endsAt: "2026-08-01T00:00:00.000Z",
        cancelledAt: "2026-08-01T00:00:00.000Z",
        vehicleSlots: 3,
        vehicleCapacity: 3,
        vehicleCount: 2,
        availableSlots: 1,
        vehicles: [],
      },
    ],
    isLoading: false,
    isError: false,
    error: null,
  }),
  useTerminateSubscriptionEarly: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useTransferVehicleSubscription: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useActivateSubscription: () => ({ mutateAsync: activateMutation, isPending: false }),
}));

describe("SubscriptionManagementPanel", () => {
  beforeEach(() => {
    activateMutation.mockReset();
    activateMutation.mockResolvedValue(undefined);
  });

  it("masque les abonnements termines par defaut et permet de les renouveler", async () => {
    render(
      <MemoryRouter>
        <SubscriptionManagementPanel fleetId="fleet-1" canManage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Pro")).toBeInTheDocument();
    expect(screen.queryByText("Starter")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("switch", { name: /Afficher les abonnements termines/i }));

    await waitFor(() => expect(screen.getByText("Starter")).toBeInTheDocument());
    expect(screen.getByRole("link", { name: /Renouveler Starter/i })).toHaveAttribute(
      "href",
      "/pricing?plan=starter&vehicles=3&renew=sub-cancelled",
    );
  });

  it("permet de recacher les abonnements termines apres les avoir affiches", async () => {
    render(
      <MemoryRouter>
        <SubscriptionManagementPanel fleetId="fleet-1" canManage />
      </MemoryRouter>,
    );

    const toggle = screen.getByRole("switch", { name: /Afficher les abonnements termines/i });

    fireEvent.click(toggle);
    await waitFor(() => expect(screen.getByText("Starter")).toBeInTheDocument());

    fireEvent.click(toggle);
    await waitFor(() => expect(screen.queryByText("Starter")).not.toBeInTheDocument());
  });

  it("affiche les emplacements disponibles par abonnement", () => {
    render(
      <MemoryRouter>
        <SubscriptionManagementPanel fleetId="fleet-1" canManage />
      </MemoryRouter>,
    );

    expect(screen.getAllByText("Emplacements disponibles").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("1 / 2").length).toBeGreaterThanOrEqual(1);
  });

  it("permet d'activer manuellement un abonnement inactif", async () => {
    render(
      <MemoryRouter>
        <SubscriptionManagementPanel fleetId="fleet-1" canManage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Activer Starter demo/i }));

    await waitFor(() => expect(activateMutation).toHaveBeenCalledWith("sub-inactive"));
  });
});
