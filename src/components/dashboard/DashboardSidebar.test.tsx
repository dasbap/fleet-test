import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import DashboardSidebar from "./DashboardSidebar";

const signOutMock = vi.fn();

vi.mock("@/lib/auth-actions", () => ({
  signOut: (...args: unknown[]) => signOutMock(...args),
}));

vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

vi.mock("@/components/shared/ActivationChecklist", () => ({
  ActivationChecklist: () => <div>activation-checklist</div>,
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: null,
    role: "organizer",
    userFleetId: "test-fleet-id",
    orgId: null,
  }),
}));

vi.mock("@/hooks/useFleetBillingContext", () => ({
  useFleetBillingContext: () => ({
    data: {
      planCode: "starter",
      isPaid: true,
      vehicleCount: 1,
      maxVehicles: 999,
      financeEnabled: true,
      aiEnabled: true,
    },
    isSuccess: true,
    isError: false,
    isLoading: false,
  }),
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
  const organizerLinks = [
    { name: /Tableau de bord/i, href: "/dashboard" },
    { name: /Véhicules/i, href: "/dashboard/vehicles" },
    { name: /Incidents/i, href: "/dashboard/incidents" },
    { name: /Maintenance/i, href: "/dashboard/maintenance" },
    { name: /Équipes/i, href: "/dashboard/teams" },
    { name: /Scores conducteurs/i, href: "/dashboard/drivers/scores" },
    { name: /Invitations/i, href: "/dashboard/invitations" },
    { name: /Rapports/i, href: "/dashboard/reports" },
    { name: /Suivi GPS/i, href: "/dashboard/tracking" },
    { name: /Finances/i, href: "/dashboard/finances" },
    { name: /Alertes/i, href: "/dashboard/alerts" },
    { name: /Rôles/i, href: "/dashboard/roles" },
  ] as const;

  beforeEach(() => {
    signOutMock.mockReset();
    signOutMock.mockResolvedValue({ error: null });
  });

  it(
    "affiche les liens de navigation pour le rôle organizer",
    async () => {
      const { container } = renderSidebar("organizer");

      // Attendre un seul lien d'ancrage puis valider le menu complet.
      await screen.findByRole("link", { name: /Tableau de bord/i });

      for (const organizerLink of organizerLinks) {
        const link = container.querySelector(`a[href="${organizerLink.href}"]`);
        expect(link).not.toBeNull();
      }
    },
    20000
  );

  it(
    "affiche le lien actif avec aria-current page",
    () => {
      renderSidebar("organizer", "/dashboard/vehicles");

      const linkVehicles = screen.getByRole("link", { name: /Véhicules/i });
      expect(linkVehicles).toHaveAttribute("aria-current", "page");
    },
    15000
  );

  it(
    "affiche Mon profil et Paramètres avec les bons href",
    async () => {
      renderSidebar("organizer");

      expect(await screen.findByRole("link", { name: /Mon profil/i })).toHaveAttribute(
        "href",
        "/dashboard/profile"
      );
      expect(await screen.findByRole("link", { name: /Paramètres/i })).toHaveAttribute(
        "href",
        "/dashboard/settings"
      );
    },
    20000
  );

  it(
    "marque Mon profil comme page courante sur /dashboard/profile",
    () => {
      renderSidebar("organizer", "/dashboard/profile");

      const linkProfil = screen.getByRole("link", { name: /Mon profil/i });
      expect(linkProfil).toHaveAttribute("aria-current", "page");
    },
    15000
  );

  it(
    "appelle signOut au clic sur Déconnexion",
    async () => {
      renderSidebar("organizer");

      const logoutButton = screen.getByRole("button", { name: /Déconnexion/i });
      fireEvent.click(logoutButton);

      await waitFor(() => {
        expect(signOutMock).toHaveBeenCalledTimes(1);
      });
    },
    20000
  );

  it(
    "affiche les entrées driver pour le rôle driver",
    async () => {
      renderSidebar("driver");

      expect(await screen.findByRole("link", { name: /Mon tableau/i })).toHaveAttribute(
        "href",
        "/dashboard"
      );
      expect(await screen.findByRole("link", { name: /Mon véhicule/i })).toHaveAttribute(
        "href",
        "/dashboard/my-vehicle"
      );
      expect(await screen.findByRole("link", { name: /Clôture/i })).toHaveAttribute(
        "href",
        "/dashboard/closure"
      );
      expect(await screen.findByRole("link", { name: /Signaler/i })).toHaveAttribute(
        "href",
        "/dashboard/incidents"
      );
    },
    20000
  );
});
