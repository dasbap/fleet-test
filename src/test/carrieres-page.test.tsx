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

function renderPage(initialEntries: string[] = ["/carrieres"]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <CarrieresPage />
    </MemoryRouter>,
  );
}

describe("CarrieresPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
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
    expect(screen.getByText(/Recruter 1 Poste A \+ 1 Poste B en parallèle/i)).toBeInTheDocument();
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

  it("masque la fiche détaillée tant que le CV n'est pas envoyé", () => {
    renderPage();

    expect(screen.queryByText("Journée type")).not.toBeInTheDocument();
    expect(screen.getAllByText(/La fiche détaillée se débloque/i).length).toBeGreaterThan(0);
  });

  it("révèle la journée type après intent d'envoi CV", () => {
    renderPage();

    const cvButtons = screen.getAllByRole("link", { name: /Envoyer mon CV par e-mail/i });
    const taxisCv = cvButtons.find((el) =>
      el.closest("#commercial-taxis-yaounde"),
    );
    expect(taxisCv).toBeDefined();

    fireEvent.click(taxisCv!);

    const toggle = screen.getByRole("button", { name: /Voir la fiche détaillée/i });
    fireEvent.click(toggle);

    expect(screen.getByText("Journée type")).toBeInTheDocument();
    expect(screen.getByText(/Terrain matinal : parkings taxis/i)).toBeInTheDocument();
  });

  it("débloque la fiche via le paramètre URL ?fiche=", () => {
    renderPage(["/carrieres?fiche=commercial-taxis-yaounde"]);

    expect(screen.getByText("Journée type")).toBeInTheDocument();
  });

  it("expose des liens mailto avec sujet de candidature commercial", () => {
    renderPage();

    const card = document.getElementById("commercial-taxis-yaounde");
    expect(card).not.toBeNull();

    const applyLink = within(card!).getByRole("link", { name: /Envoyer mon CV par e-mail/i });
    const href = applyLink.getAttribute("href") ?? "";
    expect(href).toContain("mailto:rh@e-samba.com");
    expect(decodeURIComponent(href.replace(/\+/g, " "))).toContain(
      "Candidature — Agent Commercial Terrain — Segment Taxis & VTC, Yaoundé",
    );
    expect(decodeURIComponent(href.replace(/\+/g, " "))).toContain("fiche=commercial-taxis-yaounde");
  });
});
