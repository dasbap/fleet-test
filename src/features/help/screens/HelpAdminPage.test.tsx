import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import HelpAdminPage from "./HelpAdminPage";

describe("HelpAdminPage", () => {
  it("explique le role admin plateforme sans backoffice d'articles", () => {
    render(
      <MemoryRouter>
        <HelpAdminPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: /Comprendre le role admin/i })).toBeInTheDocument();
    expect(screen.getByText(/tu peux inviter les profils utiles a une flotte/i)).toBeInTheDocument();
    expect(screen.getByText(/creation d'admins plateforme reste reservee/i)).toBeInTheDocument();
    expect(screen.getByText(/cree seulement l'organisateur/i)).toBeInTheDocument();
    expect(screen.getByText(/chaque membre suit le forfait de la flotte/i)).toBeInTheDocument();
    expect(screen.getByText(/fonctionnalites disponibles viennent du forfait/i)).toBeInTheDocument();
    expect(screen.getByText(/un chauffeur reste chauffeur/i)).toBeInTheDocument();
    expect(screen.getByText(/demande utilisateur ou etre ouverte par un admin/i)).toBeInTheDocument();
    expect(screen.getByText(/partir proprement avec les comptes crees depuis cette demo/i)).toBeInTheDocument();
    expect(screen.getByText(/ne se transforme pas en compte client/i)).toBeInTheDocument();
    expect(screen.getByText(/jusqu'a un mois apres la creation/i)).toBeInTheDocument();
    expect(screen.queryByText(/limite importante/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/ne doit pas remplacer le role de l'organisateur/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/parcours admin utiles/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/tester un scenario temporaire/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Nouvel article/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Articles FR/i)).not.toBeInTheDocument();
  });
});
