import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DemoAdminPage from "@/pages/admin/DemoAdminPage";

const mockUseRoleAccess = vi.fn();
const mockUseAdminDemoAccounts = vi.fn();

vi.mock("@/hooks/useRoleAccess", () => ({
  useRoleAccess: () => mockUseRoleAccess(),
}));

vi.mock("@/hooks/useAdminDemoAccounts", () => ({
  useAdminDemoAccounts: () => mockUseAdminDemoAccounts(),
}));

vi.mock("@/components/admin/DemoSessionsPanel", () => ({
  DemoSessionsPanel: () => <div data-testid="demo-sessions-panel" />,
}));

vi.mock("@/components/admin/CreateDemoForm", () => ({
  CreateDemoForm: () => <div data-testid="create-demo-form" />,
}));

describe("DemoAdminPage", () => {
  beforeEach(() => {
    mockUseRoleAccess.mockReset();
    mockUseAdminDemoAccounts.mockReset();
    mockUseAdminDemoAccounts.mockReturnValue({
      sessions: [],
      demoFleets: [],
      isLoading: false,
      reload: vi.fn(),
      createAccess: vi.fn(),
      suspendAccount: vi.fn(),
      reactivateAccount: vi.fn(),
      resetFleet: vi.fn(),
      generateMagicLink: vi.fn(),
    });
  });

  it("ne redirige pas pendant le chargement du statut admin", () => {
    mockUseRoleAccess.mockReturnValue({
      isAdmin: false,
      isLoading: true,
      rbac: { platformRole: null },
    });

    render(
      <MemoryRouter initialEntries={["/dashboard/admin/demo"]}>
        <Routes>
          <Route path="/dashboard/admin/demo" element={<DemoAdminPage />} />
          <Route path="/dashboard" element={<div data-testid="dashboard-page">Dashboard</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.queryByTestId("dashboard-page")).not.toBeInTheDocument();
  });

  it("affiche l'administration demo quand l'utilisateur est admin", () => {
    mockUseRoleAccess.mockReturnValue({
      isAdmin: true,
      isLoading: false,
      rbac: { platformRole: "admin" },
    });

    render(
      <MemoryRouter initialEntries={["/dashboard/admin/demo"]}>
        <Routes>
          <Route path="/dashboard/admin/demo" element={<DemoAdminPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: /acces demo e-samba/i })).toBeInTheDocument();
    expect(screen.getByTestId("demo-sessions-panel")).toBeInTheDocument();
  });
});
