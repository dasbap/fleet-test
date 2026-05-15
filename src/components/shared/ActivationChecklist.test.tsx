import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActivationChecklist } from "@/components/shared/ActivationChecklist";

const navigateMock = vi.fn();
const useActivationMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock("@/hooks/useActivation", () => ({
  useActivation: () => useActivationMock(),
}));

describe("ActivationChecklist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("affiche un skeleton quand loading=true", () => {
    useActivationMock.mockReturnValue({
      steps: [],
      completedCount: 0,
      totalCount: 5,
      percentage: 0,
      isAllDone: false,
      loading: true,
      churnRisk: "high",
    });

    const { container } = render(
      <MemoryRouter>
        <ActivationChecklist mode="sidebar" />
      </MemoryRouter>,
    );

    expect(container.querySelector(".animate-pulse")).not.toBeNull();
  });

  it("navigue au clic sur le CTA courant", () => {
    useActivationMock.mockReturnValue({
      steps: [
        {
          id: "first_vehicle",
          icon: "??",
          label: "Ajouter un premier vehicule",
          description: "desc",
          impact: "impact",
          cta: "Ajouter un vehicule",
          href: "/dashboard/vehicles",
          completed: false,
        },
      ],
      completedCount: 0,
      totalCount: 1,
      percentage: 0,
      isAllDone: false,
      loading: false,
      churnRisk: "high",
    });

    render(
      <MemoryRouter>
        <ActivationChecklist mode="sidebar" />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Ajouter un vehicule/i }));
    expect(navigateMock).toHaveBeenCalledWith("/dashboard/vehicles");
  });
});
