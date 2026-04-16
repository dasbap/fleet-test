import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DashboardPage from "@/pages/Dashboard";

const useActivationMock = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { created_at: "2026-04-10T00:00:00.000Z" },
  }),
}));

vi.mock("@/hooks/useActivation", () => ({
  useActivation: () => useActivationMock(),
}));

vi.mock("@/components/dashboard/EmptyStateDashboard", () => ({
  EmptyStateDashboard: () => <div>empty-state-dashboard</div>,
}));

vi.mock("@/components/shared/ActivationChecklist", () => ({
  ActivationChecklist: () => <div>activation-checklist</div>,
}));

describe("DashboardPage", () => {
  beforeEach(() => {
    useActivationMock.mockReset();
  });

  it("affiche le skeleton pendant le chargement", () => {
    useActivationMock.mockReturnValue({ loading: true, completedCount: 0, steps: [] });

    const { container } = render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    expect(container.querySelector(".animate-pulse")).not.toBeNull();
  });

  it("affiche l'empty state quand completedCount=0", () => {
    useActivationMock.mockReturnValue({ loading: false, completedCount: 0, steps: [] });

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("empty-state-dashboard")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Tableau de bord" })).toBeInTheDocument();
  });

  it("affiche la checklist quand activation partielle", () => {
    useActivationMock.mockReturnValue({
      loading: false,
      completedCount: 1,
      steps: [
        {
          id: "first_vehicle",
          label: "Ajouter votre premier v?hicule",
          description: "desc",
          cta: "Ajouter un v?hicule",
          href: "/dashboard/vehicles",
          icon: "??",
          impact: "impact",
          completed: false,
        },
        {
          id: "first_alert",
          label: "Configurer une alerte",
          description: "desc",
          cta: "Configurer une alerte",
          href: "/dashboard/alerts",
          icon: "??",
          impact: "impact",
          completed: false,
        },
      ],
    });

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Tableau de bord" })).toBeInTheDocument();
    expect(screen.getByText("activation-checklist")).toBeInTheDocument();
  });
});
