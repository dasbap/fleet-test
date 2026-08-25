import { fireEvent, render, screen } from "@testing-library/react";
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

  it("permet de choisir le nombre de vehicules facture sur les plans publics", () => {
    render(
      <MemoryRouter>
        <PricingPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Nombre de vehicules"), {
      target: { value: "3" },
    });

    const starterCard = screen.getByRole("heading", { name: "Starter" }).closest(".relative");
    expect(starterCard).toHaveTextContent("45 000");
    expect(starterCard).toHaveTextContent("15 000 FCFA × 3");
  });

  it("affiche des libelles francais lisibles dans le calculateur", () => {
    render(
      <MemoryRouter>
        <PricingPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Nombre de véhicules")).toBeInTheDocument();
    expect(screen.getByText("Le prix et les licences achetées suivent ce nombre.")).toBeInTheDocument();
    expect(screen.queryByText(/vÃ/)).not.toBeInTheDocument();
    expect(screen.queryByText(/achetÃ/)).not.toBeInTheDocument();
  });

  it("prefill le renouvellement depuis les parametres d'URL", () => {
    render(
      <MemoryRouter initialEntries={["/pricing?plan=starter&vehicles=3&renew=sub-cancelled"]}>
        <PricingPage />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText("Nombre de vehicules")).toHaveValue(3);

    const starterCard = screen.getByRole("heading", { name: "Starter" }).closest(".relative");
    expect(starterCard).toHaveTextContent("45 000");
    expect(starterCard).toHaveTextContent("Renouvellement");
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
  it("reserve les alertes avancees et le support prioritaire au plan Pro", () => {
    render(
      <MemoryRouter>
        <PricingPage />
      </MemoryRouter>,
    );

    const starterCard = screen.getByRole("heading", { name: "Starter" }).closest(".relative");
    const proCard = screen.getByRole("heading", { name: "Pro" }).closest(".relative");

    expect(starterCard).toBeInTheDocument();
    expect(proCard).toBeInTheDocument();
    expect(starterCard).not.toHaveTextContent("Alertes avanc");
    expect(starterCard).not.toHaveTextContent("Support prioritaire");
    expect(proCard).toHaveTextContent("Alertes avanc");
    expect(proCard).toHaveTextContent("Support prioritaire");
  });

  it("met le plan Pro en populaire avec 100 vehicules", () => {
    render(
      <MemoryRouter>
        <PricingPage />
      </MemoryRouter>,
    );

    const starterCard = screen.getByRole("heading", { name: "Starter" }).closest(".relative");
    const proCard = screen.getByRole("heading", { name: "Pro" }).closest(".relative");

    expect(starterCard).toBeInTheDocument();
    expect(proCard).toBeInTheDocument();
    expect(starterCard).not.toHaveTextContent("Populaire");
    expect(proCard).toHaveTextContent("Populaire");
    expect(proCard).toHaveTextContent(/Jusqu.*100 v/);
  });

  it("ne propose aucun lien Outlook WhatsApp ou contact sur les tarifs", () => {
    render(
      <MemoryRouter>
        <PricingPage />
      </MemoryRouter>,
    );

    const hrefs = screen
      .queryAllByRole("link")
      .map((link) => link.getAttribute("href") ?? "");

    expect(hrefs.every((href) => !href.startsWith("mailto:"))).toBe(true);
    expect(hrefs.every((href) => !href.includes("wa.me"))).toBe(true);
    const mainHrefs = Array.from(document.querySelectorAll("main a"))
      .map((link) => link.getAttribute("href") ?? "");

    expect(mainHrefs).not.toContain("/contact");
    expect(screen.queryByText(/whatsapp/i)).not.toBeInTheDocument();
  });
});
