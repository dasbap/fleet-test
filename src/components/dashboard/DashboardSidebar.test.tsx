import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import DashboardSidebar from "./DashboardSidebar";

const signOutMock = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  signOut: (...args: unknown[]) => signOutMock(...args),
}));

vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

function renderSidebar(
  userRole: "organizer" | "manager" | "driver" | "mechanic" = "organizer",
  initialRoute = "/dashboard"
) {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <SidebarProvider>
        <DashboardSidebar userRole={userRole} />
      </SidebarProvider>
    </MemoryRouter>
  );
}

describe("DashboardSidebar", () => {
  beforeEach(() => {
    signOutMock.mockReset();
    signOutMock.mockResolvedValue({ error: null });
  });

  it(
    "affiche les liens de navigation pour le rôle organizer",
    async () => {
    renderSidebar("organizer");
    await waitFor(() => {
      expect(screen.getByRole("link", { name: /Tableau de bord/i })).toBeInTheDocument();
    });

    expect(screen.getByRole("link", { name: /Tableau de bord/i })).toHaveAttribute(
      "href",
      "/dashboard"
    );
    expect(screen.getByRole("link", { name: /Véhicules/i })).toHaveAttribute(
      "href",
      "/dashboard/vehicles"
    );
    expect(screen.getByRole("link", { name: /Incidents/i })).toHaveAttribute(
      "href",
      "/dashboard/incidents"
    );
    expect(screen.getByRole("link", { name: /Maintenance/i })).toHaveAttribute(
      "href",
      "/dashboard/maintenance"
    );
    expect(screen.getByRole("link", { name: /Équipes/i })).toHaveAttribute(
      "href",
      "/dashboard/teams"
    );
    expect(screen.getByRole("link", { name: /Invitations/i })).toHaveAttribute(
      "href",
      "/dashboard/invitations"
    );
    expect(screen.getByRole("link", { name: /Rapports/i })).toHaveAttribute(
      "href",
      "/dashboard/reports"
    );
    expect(screen.getByRole("link", { name: /Finances/i })).toHaveAttribute(
      "href",
      "/dashboard/finances"
    );
    expect(screen.getByRole("link", { name: /Alertes/i })).toHaveAttribute(
      "href",
      "/dashboard/alerts"
    );
    expect(screen.getByRole("link", { name: /Rôles/i })).toHaveAttribute(
      "href",
      "/dashboard/roles"
    );
    },
    15000
  );

  it("affiche le lien actif avec aria-current page", () => {
    renderSidebar("organizer", "/dashboard/vehicles");

    const linkVehicles = screen.getByRole("link", { name: /Véhicules/i });
    expect(linkVehicles).toHaveAttribute("aria-current", "page");
  });

  it("affiche Mon profil et Paramètres avec les bons href", () => {
    renderSidebar("organizer");

    expect(screen.getByRole("link", { name: /Mon profil/i })).toHaveAttribute(
      "href",
      "/dashboard/profile"
    );
    expect(screen.getByRole("link", { name: /Paramètres/i })).toHaveAttribute(
      "href",
      "/dashboard/settings"
    );
  });

  it("marque Mon profil comme page courante sur /dashboard/profile", () => {
    renderSidebar("organizer", "/dashboard/profile");

    const linkProfil = screen.getByRole("link", { name: /Mon profil/i });
    expect(linkProfil).toHaveAttribute("aria-current", "page");
  });

  it("appelle signOut au clic sur Déconnexion", async () => {
    renderSidebar("organizer");

    const logoutButton = screen.getByRole("button", { name: /Déconnexion/i });
    fireEvent.click(logoutButton);

    await waitFor(() => {
      expect(signOutMock).toHaveBeenCalledTimes(1);
    });
  });

  it("affiche les entrées driver pour le rôle driver", () => {
    renderSidebar("driver");

    expect(screen.getByRole("link", { name: /Mon tableau/i })).toHaveAttribute(
      "href",
      "/dashboard"
    );
    expect(screen.getByRole("link", { name: /Mon véhicule/i })).toHaveAttribute(
      "href",
      "/dashboard/my-vehicle"
    );
    expect(screen.getByRole("link", { name: /Clôture/i })).toHaveAttribute(
      "href",
      "/dashboard/closure"
    );
    expect(screen.getByRole("link", { name: /Signaler/i })).toHaveAttribute(
      "href",
      "/dashboard/incidents"
    );
  });
});
