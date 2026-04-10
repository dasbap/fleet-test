import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import DashboardPage from "@/pages/Dashboard";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({ orgId: "org-1", isLoading: false })),
}));

vi.mock("@/hooks/useDashboardStats", () => ({
  useDashboardKpis: vi.fn(() => ({
    data: {
      activeVehicles: 0,
      inMaintenance: 0,
      criticalAlerts: 0,
      overdueServices: 0,
      deltaCritical: 0,
      deltaActive: 0,
    },
    isLoading: false,
  })),
}));

vi.mock("@/hooks/useDashboard", () => ({
  useDashboard: vi.fn(() => ({
    alerts: [],
    loading: false,
    resolveAlert: vi.fn(),
  })),
}));

vi.mock("@/components/dashboard/FleetTable", () => ({
  FleetTable: () => <div>FleetTableMock</div>,
}));

vi.mock("@/components/dashboard/ActivityFeedSkeleton", () => ({
  ActivityFeedSkeleton: () => <div data-testid="activity-feed-skeleton" />,
}));
vi.mock("@/components/dashboard/ActivityFeed", () => ({
  ActivityFeed: () => <div>ActivityFeedMock</div>,
}));

vi.mock("@/components/dashboard/FunnelTelemetryCard", () => ({
  FunnelTelemetryCard: () => <div>FunnelTelemetryCardMock</div>,
}));

describe("DashboardPage", () => {
  it("affiche l'empty state engageant quand aucun véhicule actif", async () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("button", { name: "Ajouter mon véhicule" })).toBeInTheDocument();
    expect(screen.getByText(/activer le suivi/i)).toBeInTheDocument();
    expect(screen.getByText("Valeur activée")).toBeInTheDocument();
  });
});
