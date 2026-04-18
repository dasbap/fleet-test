import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActivationBanner } from "@/components/shared/ActivationBanner";

const useActivationMock = vi.fn();
const navigateMock = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock("@/hooks/useActivation", () => ({
  useActivation: () => useActivationMock(),
}));

describe("ActivationBanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("n'affiche rien quand le bandeau est masque", () => {
    useActivationMock.mockReturnValue({
      steps: [],
      completedCount: 0,
      totalCount: 4,
      percentage: 0,
      isAllDone: false,
      loading: false,
      isBannerVisible: false,
      dismissBanner: vi.fn(),
    });

    const { container } = render(
      <MemoryRouter>
        <ActivationBanner />
      </MemoryRouter>,
    );
    expect(container.firstChild).toBeNull();
  });

  it("navigue vers la prochaine etape via le CTA", () => {
    useActivationMock.mockReturnValue({
      steps: [
        {
          id: "step1",
          icon: "🚐",
          label: "Ajouter un premier vehicule",
          description: "desc",
          impact: "impact",
          cta: "Ajouter un vehicule",
          href: "/dashboard/vehicles",
          completed: true,
        },
        {
          id: "step2",
          icon: "🚨",
          label: "Configurer vos alertes",
          description: "desc",
          impact: "impact",
          cta: "Configurer les alertes",
          href: "/dashboard/settings",
          completed: false,
        },
      ],
      completedCount: 1,
      totalCount: 4,
      percentage: 25,
      isAllDone: false,
      loading: false,
      isBannerVisible: true,
      dismissBanner: vi.fn(),
    });

    render(
      <MemoryRouter>
        <ActivationBanner />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Configurer les alertes/i }));
    expect(navigateMock).toHaveBeenCalledWith("/dashboard/settings");
  });

  it("appelle dismissBanner au clic sur fermer", () => {
    const dismissBanner = vi.fn();
    useActivationMock.mockReturnValue({
      steps: [
        {
          id: "step2",
          icon: "🚨",
          label: "Configurer vos alertes",
          description: "desc",
          impact: "impact",
          cta: "Configurer les alertes",
          href: "/dashboard/settings",
          completed: false,
        },
      ],
      completedCount: 1,
      totalCount: 4,
      percentage: 25,
      isAllDone: false,
      loading: false,
      isBannerVisible: true,
      dismissBanner,
    });

    render(
      <MemoryRouter>
        <ActivationBanner />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Masquer ce bandeau" }));
    expect(dismissBanner).toHaveBeenCalledTimes(1);
  });
});
