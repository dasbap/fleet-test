import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import FonctionnalitesPage from "@/pages/public/FonctionnalitesPage";

vi.mock("@/hooks/usePageSeo", () => ({
  usePageSeo: vi.fn(),
}));

describe("FonctionnalitesPage", () => {
  it("affiche une seule section commerciale compacte", () => {
    render(
      <MemoryRouter>
        <FonctionnalitesPage />
      </MemoryRouter>,
    );

    const sectionLinks = screen.getAllByRole("link", {
      name: /Piloter votre flotte/i,
    });

    expect(sectionLinks).toHaveLength(1);
    expect(sectionLinks[0]).toHaveAttribute(
      "href",
      "/fonctionnalites/piloter-flotte",
    );
    expect(screen.getByText("Voir plus clair")).toBeInTheDocument();
    expect(screen.getByText("Agir plus vite")).toBeInTheDocument();
    expect(screen.getByText("Garder le cap")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Suivre la flotte/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Garder le controle/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
  });

  it("reste volontairement vague sur le fonctionnement interne", () => {
    render(
      <MemoryRouter>
        <FonctionnalitesPage />
      </MemoryRouter>,
    );

    expect(screen.queryByText(/architecture/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/permissions/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/sanctions automatiques/i)).not.toBeInTheDocument();
  });
});
