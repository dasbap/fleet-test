import { beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import DashboardHeader from "./DashboardHeader";

const { universalSearchSpy } = vi.hoisted(() => ({
  universalSearchSpy: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({
    userFleetId: "fleet-test-1",
    tenantOptions: [],
    setActiveFleetId: vi.fn(),
  })),
}));

vi.mock("@/hooks/useAlerts", () => ({
  useAlerts: vi.fn(() => ({ data: [] })),
}));

vi.mock("@/lib/auth-actions", () => ({
  signOut: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/components/shared/UniversalSearch", () => ({
  UniversalSearch: (props: { fleetId: string | null; className?: string }) => {
    universalSearchSpy(props);
    return <div data-testid="universal-search-mock" />;
  },
}));

vi.mock("@/features/account/hooks/useNetworkOnline", () => ({
  useNetworkOnline: vi.fn(() => true),
}));

function renderHeader(props: {
  userRole: "organizer" | "manager" | "driver" | "mechanic";
  displayName?: string;
  initials?: string;
  isPlatformAdmin?: boolean;
}) {
  return render(
    <MemoryRouter>
      <SidebarProvider>
        <DashboardHeader {...props} />
      </SidebarProvider>
    </MemoryRouter>
  );
}

describe("DashboardHeader", () => {
  beforeEach(() => {
    universalSearchSpy.mockClear();
  });

  it("affiche le header avec classes cohérentes au thème sombre (structure stable)", () => {
    const { container } = renderHeader({
      userRole: "manager",
      displayName: "Utilisateur Test",
      initials: "UT",
    });

    const header = container.querySelector("header");
    expect(header).toBeInTheDocument();
    // Classes attendues pour le thème sombre (tokens, pas de couleurs light en dur)
    expect(header).toHaveClass("bg-card/50", "border-border");
    expect(screen.getByText("Utilisateur Test")).toBeInTheDocument();
    expect(screen.getByText("Gestionnaire")).toBeInTheDocument();
  });

  it("correspond au snapshot (régression structure / thème)", () => {
    const { container } = renderHeader({
      userRole: "organizer",
      displayName: "Admin",
      initials: "AD",
    });
    expect(container.firstChild).toMatchSnapshot();
  });

  it("intègre UniversalSearch avec la flotte active et une largeur contrainte", () => {
    renderHeader({
      userRole: "driver",
      displayName: "Chauffeur Test",
      initials: "CT",
    });

    const search = screen.getByTestId("universal-search-mock");
    expect(search).toBeInTheDocument();
    expect(universalSearchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        fleetId: "fleet-test-1",
        className: "hidden min-w-0 max-w-md flex-1 lg:block",
      }),
    );
  });

  it("contraint les zones gauche et droite pour eviter le debordement mobile", () => {
    const { container } = renderHeader({
      userRole: "organizer",
      displayName: "Tuto Organisateur",
      initials: "TO",
    });

    const left = container.querySelector("[data-testid='dashboard-header-left']");
    const right = container.querySelector("[data-testid='dashboard-header-right']");

    expect(left).toHaveClass("min-w-0", "flex-1");
    expect(right).toHaveClass("min-w-0", "shrink-0");
    expect(screen.getByRole("button", { name: /ouvrir le menu dashboard/i })).toBeInTheDocument();
  });

  it("affiche un bouton pour revenir a l'accueil public", () => {
    renderHeader({
      userRole: "manager",
      displayName: "Utilisateur Test",
      initials: "UT",
    });

    expect(screen.getByRole("link", { name: /retour accueil/i })).toHaveAttribute("href", "/");
  });

  it("masque les contrôles métier flotte pour un admin plateforme", () => {
    renderHeader({
      userRole: "organizer",
      displayName: "Super Admin",
      initials: "SA",
      isPlatformAdmin: true,
    });

    expect(screen.queryByTestId("universal-search-mock")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /alerte/i })).not.toBeInTheDocument();
    expect(screen.getByText("Admin plateforme")).toBeInTheDocument();
    expect(universalSearchSpy).not.toHaveBeenCalled();
  });
});
