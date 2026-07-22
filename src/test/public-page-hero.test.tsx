import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { PublicPageHero } from "@/components/landing/PublicPageHero";

function renderHero(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("PublicPageHero", () => {
  it("masque le lien Accueil par defaut", () => {
    const { container } = renderHero(<PublicPageHero eyebrow="Tarifs" title="Tarifs" />);

    expect(screen.queryByRole("link", { name: /Accueil/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Tarifs")).toBeInTheDocument();
    expect(container.firstElementChild).toHaveClass("pt-20", "pb-6");
    expect(container.firstElementChild).not.toHaveClass("pt-28", "pb-12");
  });

  it("ne rend plus le nom de page en libelle vert", () => {
    renderHero(<PublicPageHero eyebrow="FAQ" title="Questions frequentes" />);

    expect(screen.queryByText("FAQ")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Questions frequentes" })).toBeInTheDocument();
  });
});
