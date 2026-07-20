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
        className: "max-w-md",
      }),
    );
  });
});
