import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { TenantBootstrapRoute } from "@/components/auth/TenantBootstrapRoute";

const mockUseAuth = vi.fn();
const mockUseRoleAccess = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/hooks/useRoleAccess", () => ({
  useRoleAccess: () => mockUseRoleAccess(),
}));

vi.mock("@/hooks/useWaitForProfileReady", () => ({
  useWaitForProfileReady: () => ({
    status: "ready",
    isPending: false,
    isReady: true,
    timedOut: false,
  }),
}));

vi.mock("@/pages/CreateFleet", () => ({
  default: () => <div data-testid="create-fleet" />,
}));

describe("TenantBootstrapRoute", () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
    mockUseRoleAccess.mockReset();
    mockUseRoleAccess.mockReturnValue({
      isAdmin: false,
      isLoading: false,
    });
  });

  function renderAtStart() {
    return render(
      <MemoryRouter initialEntries={["/start"]}>
        <Routes>
          <Route path="/start" element={<TenantBootstrapRoute />} />
          <Route path="/dashboard" element={<div data-testid="dashboard" />} />
          <Route path="/dashboard/admin" element={<div data-testid="admin-dashboard" />} />
        </Routes>
      </MemoryRouter>
    );
  }

  it("redirige vers le dashboard lorsque le contexte tenant est prêt", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "u1" },
      isLoading: false,
      isTenantOrgLoading: false,
      memberships: [
        { id: "m1", fleet_id: "f1", role: "organizer" as const, is_active: true },
      ],
      activeTenantContext: {
        orgId: "o1",
        fleetId: "f1",
        role: "organizer" as const,
      },
    });
    renderAtStart();
    expect(screen.getByTestId("dashboard")).toBeInTheDocument();
  });

  it("affiche le chargement lorsque les adhésions existent mais le contexte org est en cours de résolution", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "u1" },
      isLoading: false,
      isTenantOrgLoading: true,
      memberships: [
        { id: "m1", fleet_id: "f1", role: "organizer" as const, is_active: true },
      ],
      activeTenantContext: null,
    });
    renderAtStart();
    expect(document.querySelector(".animate-spin")).toBeTruthy();
    expect(screen.queryByTestId("create-fleet")).not.toBeInTheDocument();
  });

  it("affiche la création de flotte lorsqu'il n'y a pas d'adhésion", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "u1" },
      isLoading: false,
      isTenantOrgLoading: false,
      memberships: [],
      activeTenantContext: null,
    });
    renderAtStart();
    expect(screen.getByTestId("create-fleet")).toBeInTheDocument();
  });

  it("redirige un admin plateforme sans flotte vers le dashboard admin", () => {
    mockUseRoleAccess.mockReturnValue({
      isAdmin: true,
      isLoading: false,
    });
    mockUseAuth.mockReturnValue({
      user: { id: "admin1" },
      isLoading: false,
      isTenantOrgLoading: false,
      memberships: [],
      activeTenantContext: null,
    });

    renderAtStart();

    expect(screen.getByTestId("admin-dashboard")).toBeInTheDocument();
    expect(screen.queryByTestId("create-fleet")).not.toBeInTheDocument();
  });
});
