import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { FonctionnaliteSectionPage } from "@/pages/public/FonctionnaliteSectionPage";

vi.mock("@/hooks/usePageSeo", () => ({
  usePageSeo: vi.fn(),
}));

describe("FonctionnaliteSectionPage", () => {
  it("affiche la page dediee de la section unique", () => {
    render(
      <MemoryRouter>
        <FonctionnaliteSectionPage slug="piloter-flotte" />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Piloter votre flotte" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Retour aux fonctionnalites/i })).toHaveAttribute(
      "href",
      "/fonctionnalites",
    );
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    expect(screen.queryByText("Fonctionnalites")).not.toBeInTheDocument();
  });

  it("reste vague sur les details internes", () => {
    render(
      <MemoryRouter>
        <FonctionnaliteSectionPage slug="piloter-flotte" />
      </MemoryRouter>,
    );

    expect(screen.queryByText(/architecture/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/permissions/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/sanctions automatiques/i)).not.toBeInTheDocument();
  });
});
