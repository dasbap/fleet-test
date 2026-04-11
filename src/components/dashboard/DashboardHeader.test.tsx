import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import DashboardHeader from "./DashboardHeader";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({ userFleetId: "fleet-test-1" })),
}));

vi.mock("@/lib/auth-actions", () => ({
  signOut: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/components/dashboard/UniversalSearch", () => ({
  UniversalSearch: () => <div data-testid="universal-search-mock" />,
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
});
