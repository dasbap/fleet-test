import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DashboardLayout from "./DashboardLayout";

const { mockUseAuth, mockUseRoleAccess, headerRoleSpy, notchPayCallbackSpy } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockUseRoleAccess: vi.fn(),
  headerRoleSpy: vi.fn(),
  notchPayCallbackSpy: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/hooks/useRealtimeNotifications", () => ({
  useRealtimeNotifications: vi.fn(),
}));

vi.mock("@/hooks/useRoleAccess", () => ({
  useRoleAccess: () => mockUseRoleAccess(),
}));

vi.mock("@/features/billing/hooks/useNotchPayCallback", () => ({
  useNotchPayCallback: () => notchPayCallbackSpy(),
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
  default: (props: {
    userRole: string;
    displayName?: string;
    initials?: string;
    isPlatformAdmin?: boolean;
  }) => {
    headerRoleSpy(props);
    return <div data-testid="header-mock">{props.userRole}</div>;
  },
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom"
  );
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
    notchPayCallbackSpy.mockReset();
    mockUseAuth.mockReset();
    mockUseRoleAccess.mockReturnValue({ isAdmin: false });
  });

  it("monte le callback Notch Pay au niveau dashboard", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "u1", email: "seb@test.com", user_metadata: {} },
      role: "organizer",
      userFleetId: "fleet-1",
      activeTenantContext: null,
    });

    render(
      <MemoryRouter initialEntries={["/dashboard/billing?status=success&ref=ESAMBA-TEST"]}>
        <DashboardLayout />
      </MemoryRouter>
    );

    expect(notchPayCallbackSpy).toHaveBeenCalledTimes(1);
  });

  it("utilise le rôle de la flotte active quand il diffère du rôle global", () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: "u1",
        email: "seb@test.com",
        user_metadata: { full_name: "Sébastien Ouene" },
      },
      role: "organizer",
      userFleetId: "fleet-principale",
      activeTenantContext: {
        orgId: "o1",
        fleetId: "fleet-principale",
        role: "manager",
      },
    });

    render(
      <MemoryRouter>
        <DashboardLayout />
      </MemoryRouter>
    );

    expect(headerRoleSpy).toHaveBeenCalledWith(
      expect.objectContaining({ userRole: "manager", isPlatformAdmin: false })
    );
    expect(screen.getByTestId("sidebar-mock")).toHaveAttribute(
      "data-user-role",
      "manager"
    );
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
      </MemoryRouter>
    );

    expect(headerRoleSpy).toHaveBeenCalledWith(
      expect.objectContaining({ userRole: "organizer", isPlatformAdmin: false })
    );
  });

  it("transmet le mode admin plateforme au header", () => {
    mockUseRoleAccess.mockReturnValue({ isAdmin: true });
    mockUseAuth.mockReturnValue({
      user: {
        id: "admin-1",
        email: "admin@test.com",
        user_metadata: { full_name: "Admin" },
      },
      role: "organizer",
      userFleetId: null,
      activeTenantContext: null,
    });

    render(
      <MemoryRouter>
        <DashboardLayout />
      </MemoryRouter>
    );

    expect(headerRoleSpy).toHaveBeenCalledWith(
      expect.objectContaining({ userRole: "organizer", isPlatformAdmin: true })
    );
  });
});
