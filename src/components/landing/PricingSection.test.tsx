import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import PricingSection from "@/components/landing/PricingSection";

describe("PricingSection", () => {
  it("n'affiche pas de CTA connexion dans les cartes de tarifs", () => {
    render(
      <MemoryRouter>
        <PricingSection />
      </MemoryRouter>,
    );

    expect(screen.queryByRole("link", { name: /commencer/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /démarrer/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /nous contacter/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /voir le calculateur de tarifs/i })).toHaveAttribute(
      "href",
      "/pricing",
    );
  });
});
