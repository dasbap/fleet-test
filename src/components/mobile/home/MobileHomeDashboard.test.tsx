import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MobileHomeDashboard } from "./MobileHomeDashboard";

const { mockUseAuth, mockUseMobileHomeKpis } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockUseMobileHomeKpis: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/hooks/useMobileHomeKpis", () => ({
  useMobileHomeKpis: () => mockUseMobileHomeKpis(),
}));

vi.mock("@/hooks/useRoleAccess", () => ({
  useRoleAccess: () => ({
    rbac: { platformRole: "manager" },
    can: () => true,
  }),
}));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

function renderHome() {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <MobileHomeDashboard />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("MobileHomeDashboard", () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
    mockUseMobileHomeKpis.mockReset();

    mockUseAuth.mockReturnValue({
      role: "manager",
      userFleetId: "fleet-1",
      orgId: "org-1",
    });

    mockUseMobileHomeKpis.mockReturnValue({
      kpis: {
        activeVehicles: 12,
        immobilizedVehicles: 3,
        criticalAlertsOpen: 2,
        missionsInProgress: 6,
      },
      isLoading: false,
      isError: false,
    });
  });

  it(
    "affiche uniquement les 4 KPI demandés et les 3 actions rapides",
    async () => {
      renderHome();

      expect(screen.getByText("Véhicules actifs")).toBeInTheDocument();
      expect(screen.getByText("Immobilisés")).toBeInTheDocument();
      expect(screen.getByText("Alertes critiques")).toBeInTheDocument();
      expect(screen.getByText("Missions en cours")).toBeInTheDocument();
      expect(screen.queryByText("Entretiens cette semaine")).not.toBeInTheDocument();

      expect(await screen.findByRole("link", { name: /déclarer incident/i })).toBeInTheDocument();
      expect(await screen.findByRole("link", { name: /voir flotte/i })).toBeInTheDocument();
      expect(
        await screen.findByRole("link", { name: /créer une intervention/i })
      ).toBeInTheDocument();
    },
    15_000
  );

  it(
    "utilise les bonnes URLs pour les actions rapides selon le rôle",
    () => {
    // Cas manager (rôle par défaut dans beforeEach)
    const { rerender } = renderHome();

    expect(
      screen.getByRole("link", { name: /déclarer incident/i }).getAttribute("href")
    ).toBe("/dashboard/incidents/declare");
    expect(
      screen.getByRole("link", { name: /voir flotte/i }).getAttribute("href")
    ).toBe("/dashboard/vehicles");
    expect(
      screen.getByRole("link", { name: /créer une intervention/i }).getAttribute("href")
    ).toBe("/dashboard/maintenance");

    // Cas driver
    mockUseAuth.mockReturnValue({
      role: "driver",
    });

    rerender(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <MobileHomeDashboard />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(
      screen.getByRole("link", { name: /déclarer incident/i }).getAttribute("href")
    ).toBe("/dashboard/incidents/declare");
    expect(
      screen.getByRole("link", { name: /voir flotte/i }).getAttribute("href")
    ).toBe("/dashboard/my-vehicle");
    expect(
      screen.getByRole("link", { name: /créer une intervention/i }).getAttribute("href")
    ).toBe("/dashboard/maintenance");
    },
    15_000,
  );
});
