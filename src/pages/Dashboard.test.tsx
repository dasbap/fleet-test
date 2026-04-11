import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import DashboardPage from "@/pages/Dashboard";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({
    orgId: "org-1",
    userFleetId: "fleet-1",
    user: {
      id: "user-1",
      created_at: "2020-01-01T00:00:00.000Z",
      user_metadata: {},
      email: "test@example.com",
    },
    isLoading: false,
  })),
}));

vi.mock("@/hooks/useActionableDashboard", () => ({
  useActionableDashboard: vi.fn(() => ({
    kpis: {
      activeVehicles: 0,
      inMaintenance: 0,
      criticalAlerts: 0,
      overdueServices: 0,
      deltaCritical: 0,
      deltaActive: 0,
    },
    alerts: [],
    resolveAlert: vi.fn(),
    scheduledJobs: [],
    avgKm: 0,
    todayRevenueXaf: 0,
    totalVehicles: 0,
    loading: false,
  })),
}));

vi.mock("@/hooks/useFeedbackPrompt", () => ({
  useFeedbackPrompt: () => ({
    show: false,
    trigger: "manual" as const,
    entityId: undefined,
    entityType: undefined,
    dismiss: vi.fn(),
    fire: vi.fn(),
  }),
}));

describe("DashboardPage", () => {
  it("affiche l'empty state engageant quand aucun véhicule actif", async () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Bienvenue/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ajouter maintenant" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Tableau de bord" })).toBeInTheDocument();
  });
});
