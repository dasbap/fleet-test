import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { FleetTeamManagementPanel } from "./FleetTeamManagementPanel";

const { mockUseAuth, mockUsePermissions, mockUseRoleAccess, mockUseFleetMembers } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockUsePermissions: vi.fn(),
  mockUseRoleAccess: vi.fn(),
  mockUseFleetMembers: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => mockUsePermissions(),
}));

vi.mock("@/hooks/useRoleAccess", () => ({
  useRoleAccess: () => mockUseRoleAccess(),
}));

vi.mock("@/hooks/useFleetMembers", () => ({
  useFleetMembers: (...args: unknown[]) => mockUseFleetMembers(...args),
  useAddFleetMember: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateMemberRole: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRemoveFleetMember: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("@/hooks/useSearchUsers", () => ({
  useSearchUsers: () => ({ data: [], isLoading: false }),
}));

vi.mock("@/hooks/useActivation", () => ({
  useActivation: () => ({ completeStep: vi.fn() }),
}));

vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

const activeManager = {
  id: "m1",
  user_id: "u2",
  fleet_id: "fleet-1",
  role: "manager" as const,
  is_active: true,
  created_at: "2026-06-08T00:00:00Z",
  profile: { full_name: "Sébastien Ouene", phone: null },
};

const inactiveDriver = {
  id: "m2",
  user_id: "u3",
  fleet_id: "fleet-1",
  role: "driver" as const,
  is_active: false,
  created_at: "2026-05-28T00:00:00Z",
  profile: { full_name: "Aloys", phone: null },
};

function setupMocks(members: typeof activeManager[] = [activeManager]) {
  mockUseAuth.mockReturnValue({
    user: { id: "u-org", email: "org@test.com" },
    userFleetId: "fleet-1",
    activeTenantContext: { orgId: "o1", fleetId: "fleet-1", role: "organizer" },
  });
  mockUsePermissions.mockReturnValue({ canAccessBackoffice: true });
  mockUseRoleAccess.mockReturnValue({ can: () => true });
  mockUseFleetMembers.mockReturnValue({
    data: members,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  });
}

describe("FleetTeamManagementPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it("affiche « Gestionnaire » et non « Manager » pour le rôle manager", () => {
    render(
      <MemoryRouter>
        <FleetTeamManagementPanel layout="page" currentUserId="u-org" />
      </MemoryRouter>,
    );

    expect(screen.getByText("Sébastien Ouene")).toBeInTheDocument();
    expect(screen.getAllByText("Gestionnaire").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("Manager")).not.toBeInTheDocument();
  });

  it("masque les membres inactifs par défaut", () => {
    setupMocks([activeManager, inactiveDriver]);

    render(
      <MemoryRouter>
        <FleetTeamManagementPanel layout="page" currentUserId="u-org" />
      </MemoryRouter>,
    );

    expect(screen.getByText("Sébastien Ouene")).toBeInTheDocument();
    expect(screen.queryByText("Aloys")).not.toBeInTheDocument();
    expect(screen.getByText(/1 actif · 1 inactif/)).toBeInTheDocument();
  });

  it("affiche les membres inactifs quand le toggle est activé", () => {
    setupMocks([activeManager, inactiveDriver]);

    render(
      <MemoryRouter>
        <FleetTeamManagementPanel layout="page" currentUserId="u-org" />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByLabelText("Afficher inactifs"));

    expect(screen.getByText("Aloys")).toBeInTheDocument();
    expect(screen.getByText("Inactif")).toBeInTheDocument();
  });

});
