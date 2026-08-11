import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { SubscriptionManagementPanel } from "./SubscriptionManagementPanel";

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
}));

describe("SubscriptionManagementPanel", () => {
  it("masque les abonnements termines par defaut et permet de les renouveler", () => {
    render(
      <MemoryRouter>
        <SubscriptionManagementPanel fleetId="fleet-1" canManage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Pro")).toBeInTheDocument();
    expect(screen.queryByText("Starter")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("switch", { name: /Afficher les abonnements termines/i }));

    expect(screen.getByText("Starter")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Renouveler Starter/i })).toHaveAttribute(
      "href",
      "/pricing?plan=starter&vehicles=3&renew=sub-cancelled",
    );
  });

  it("permet de recacher les abonnements termines apres les avoir affiches", () => {
    render(
      <MemoryRouter>
        <SubscriptionManagementPanel fleetId="fleet-1" canManage />
      </MemoryRouter>,
    );

    const toggle = screen.getByRole("switch", { name: /Afficher les abonnements termines/i });

    fireEvent.click(toggle);
    expect(screen.getByText("Starter")).toBeInTheDocument();

    fireEvent.click(toggle);
    expect(screen.queryByText("Starter")).not.toBeInTheDocument();
  });

  it("affiche les emplacements disponibles par abonnement", () => {
    render(
      <MemoryRouter>
        <SubscriptionManagementPanel fleetId="fleet-1" canManage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Emplacements disponibles")).toBeInTheDocument();
    expect(screen.getAllByText("1 / 2").length).toBeGreaterThanOrEqual(1);
  });
});
