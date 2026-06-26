import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CarrieresPage from "@/pages/Carrieres";
import { CARRIERES_POSTES } from "@/data/marketing/carrieres-postes";

vi.mock("@/hooks/usePageSeo", () => ({
  usePageSeo: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuthOptional: () => ({ user: null, loading: false }),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <CarrieresPage />
    </MemoryRouter>,
  );
}

describe("CarrieresPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("affiche les 6 titres de postes", () => {
    renderPage();

    for (const poste of CARRIERES_POSTES) {
      expect(screen.getAllByText(poste.title).length).toBeGreaterThanOrEqual(1);
    }
  });

  it("affiche la synthèse commerciale Yaoundé", () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "Équipe commerciale Yaoundé" })).toBeInTheDocument();
    expect(screen.getByText("Poste A — Taxis/VTC")).toBeInTheDocument();
    expect(screen.getByText("Poste B — PME/Institutions")).toBeInTheDocument();
    expect(screen.getByText(/Recommandation : recruter 1 Poste A \+ 1 Poste B/i)).toBeInTheDocument();
  });

  it("n'affiche plus le poste Business Developer CEMAC générique", () => {
    renderPage();

    expect(screen.queryByText(/Business Developer CEMAC/i)).not.toBeInTheDocument();
  });

  it("sépare recrutement prioritaire et ouvertures à venir", () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "Recrutement prioritaire" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ouvertures à venir" })).toBeInTheDocument();
  });

  it("n'affiche aucune fourchette salariale en FCFA", () => {
    const { container } = renderPage();
    const text = container.textContent ?? "";

    expect(text).not.toMatch(/\d[\d\s]*FCFA/i);
    expect(text).not.toMatch(/80\s*000/);
    expect(text).not.toMatch(/150\s*000/);
  });

  it("révèle la journée type au clic sur le poste taxis", () => {
    renderPage();

    const toggle = screen.getByRole("button", {
      name: /Agent Commercial Terrain — Segment Taxis/i,
    });

    expect(screen.queryByText("Journée type")).not.toBeInTheDocument();

    fireEvent.click(toggle);

    expect(screen.getByText("Journée type")).toBeInTheDocument();
    expect(screen.getByText(/Terrain matinal : parkings taxis/i)).toBeInTheDocument();
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  it("expose des liens mailto avec sujet de candidature commercial", () => {
    renderPage();

    const toggle = screen.getByRole("button", {
      name: /Agent Commercial Terrain — Segment Taxis/i,
    });
    fireEvent.click(toggle);

    const card = document.getElementById("commercial-taxis-yaounde");
    expect(card).not.toBeNull();

    const applyLink = within(card!).getByRole("link", { name: /Postuler/i });
    const href = applyLink.getAttribute("href") ?? "";
    expect(href).toContain("mailto:rh@e-samba.com");
    expect(decodeURIComponent(href.replace(/\+/g, " "))).toContain(
      "Candidature — Agent Commercial Terrain — Segment Taxis & VTC, Yaoundé",
    );
  });
});
