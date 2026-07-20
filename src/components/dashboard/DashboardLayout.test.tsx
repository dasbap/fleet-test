import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DashboardLayout from "./DashboardLayout";

const { mockUseAuth, headerRoleSpy } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  headerRoleSpy: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/hooks/useRealtimeNotifications", () => ({
  useRealtimeNotifications: vi.fn(),
}));

vi.mock("@/lib/platform", () => ({
  isNativePlatform: () => false,
}));

vi.mock("@/components/dashboard/DashboardSidebar", () => ({
  default: ({ userRole }: { userRole: string }) => (
    <div data-testid="sidebar-mock" data-user-role={userRole} />
  ),
}));

vi.mock("./DashboardHeader", () => ({
  default: (props: { userRole: string; displayName?: string; initials?: string }) => {
    headerRoleSpy(props.userRole);
    return <div data-testid="header-mock">{props.userRole}</div>;
  },
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    Outlet: () => <div data-testid="outlet-mock" />,
  };
});

vi.mock("@/components/OfflinePendingSyncBridge", () => ({
  OfflinePendingSyncBridge: () => null,
}));

vi.mock("@/components/shared/OfflineBanner", () => ({
  OfflineBanner: () => null,
}));

vi.mock("@/components/shared/ActivationBanner", () => ({
  ActivationBanner: () => null,
}));

vi.mock("@/components/activation/DriverTerrainActivationModal", () => ({
  DriverTerrainActivationModal: () => null,
}));

vi.mock("@/components/shared/HelpCenter", () => ({
  HelpBubble: () => null,
}));

describe("DashboardLayout — rôle affiché par flotte active", () => {
  beforeEach(() => {
    headerRoleSpy.mockReset();
    mockUseAuth.mockReset();
  });

  it("utilise le rôle de la flotte active quand il diffère du rôle global", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "u1", email: "seb@test.com", user_metadata: { full_name: "Sébastien Ouene" } },
      role: "organizer",
      userFleetId: "fleet-principale",
      activeTenantContext: { orgId: "o1", fleetId: "fleet-principale", role: "manager" },
    });

    render(
      <MemoryRouter>
        <DashboardLayout />
      </MemoryRouter>,
    );

    expect(headerRoleSpy).toHaveBeenCalledWith("manager");
    expect(screen.getByTestId("sidebar-mock")).toHaveAttribute("data-user-role", "manager");
  });

  it("retombe sur le rôle global si activeTenantContext est absent", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "u1", email: "seb@test.com", user_metadata: {} },
      role: "organizer",
      userFleetId: "fleet-1",
      activeTenantContext: null,
    });

    render(
      <MemoryRouter>
        <DashboardLayout />
      </MemoryRouter>,
    );

    expect(headerRoleSpy).toHaveBeenCalledWith("organizer");
  });
});
