import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import PricingPage from "@/pages/Pricing";

vi.mock("@/hooks/usePageSeo", () => ({
  usePageSeo: vi.fn(),
}));

vi.mock("@/hooks/useBillingCheckout", () => ({
  useBillingCheckout: () => ({
    state: { status: "idle" },
    initiate: vi.fn(),
    reset: vi.fn(),
    isLoading: false,
    bffAvailable: true,
  }),
}));

describe("PricingPage", () => {
  it("n'affiche plus le plan Free dans les tarifs", () => {
    render(
      <MemoryRouter>
        <PricingPage />
      </MemoryRouter>,
    );

    expect(screen.queryByRole("heading", { name: "Free" })).not.toBeInTheDocument();
    expect(screen.queryByText("Commencer gratuitement")).not.toBeInTheDocument();
  });

  it("centre les trois plans restants sur desktop", () => {
    render(
      <MemoryRouter>
        <PricingPage />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("pricing-plans-grid")).toHaveClass("lg:grid-cols-3");
  });

  it("n'affiche plus le configurateur d'abonnement", () => {
    render(
      <MemoryRouter>
        <PricingPage />
      </MemoryRouter>,
    );

    expect(screen.queryByRole("heading", { name: "Configurez votre abonnement" })).not.toBeInTheDocument();
    expect(screen.queryByText("Durée d'engagement")).not.toBeInTheDocument();
    expect(screen.queryByText("Options complémentaires")).not.toBeInTheDocument();
  });

  it("n'affiche plus le CTA final de flotte", () => {
    render(
      <MemoryRouter>
        <PricingPage />
      </MemoryRouter>,
    );

    expect(screen.queryByText(/Prêt à/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Démarrer gratuitement")).not.toBeInTheDocument();
  });
});
