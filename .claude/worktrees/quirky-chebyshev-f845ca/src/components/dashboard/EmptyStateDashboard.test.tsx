import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EmptyStateDashboard } from "@/components/dashboard/EmptyStateDashboard";

const useActivationMock = vi.fn();

vi.mock("@/hooks/useActivation", () => ({
  useActivation: () => useActivationMock(),
}));

describe("EmptyStateDashboard", () => {
  beforeEach(() => {
    useActivationMock.mockReturnValue({
      steps: [
        {
          id: "first_vehicle",
          icon: "🚐",
          label: "Ajouter un premier véhicule",
          description: "desc",
          impact: "impact",
          cta: "Ajouter un véhicule",
          href: "/dashboard/vehicles",
          completed: false,
        },
      ],
      completedCount: 0,
      completeStep: vi.fn(),
    });
  });

  it("affiche le message J0 et les quick wins par défaut", () => {
    render(
      <MemoryRouter>
        <EmptyStateDashboard daysSinceSignup={0} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Bienvenue dans E-Samba 👋" })).toBeInTheDocument();
    expect(screen.getByText("3 actions pour démarrer")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ajouter un véhicule/i })).toBeInTheDocument();
  });
});
