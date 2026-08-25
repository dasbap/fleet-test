import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { PlanGuard } from "./PlanGuard";

const { mockUseAuth, mockUseFleetSiteAccess } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockUseFleetSiteAccess: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/hooks/useFleetSiteAccess", () => ({
  useFleetSiteAccess: () => mockUseFleetSiteAccess(),
}));

function mockAuthenticatedUser(role = "organizer") {
  mockUseAuth.mockReturnValue({
    user: { id: "u1" },
    orgId: "o1",
    activeTenantContext: { fleetId: "f1", role },
    isLoading: false,
  });
}

describe("PlanGuard", () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
    mockUseFleetSiteAccess.mockReset();
  });

  it("affiche les enfants lorsque le RPC autorise l'accès", () => {
    mockAuthenticatedUser();
    mockUseFleetSiteAccess.mockReturnValue({ data: true, isLoading: false });

    render(
      <MemoryRouter>
        <PlanGuard>
          <div data-testid="paid">Contenu payant</div>
        </PlanGuard>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("paid")).toBeInTheDocument();
  });

  it("autorise aussi un conducteur membre actif lorsque la flotte a accès", () => {
    mockAuthenticatedUser("driver");
    mockUseFleetSiteAccess.mockReturnValue({ data: true, isLoading: false });

    render(
      <MemoryRouter>
        <PlanGuard>
          <div data-testid="driver-access">Dashboard</div>
        </PlanGuard>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("driver-access")).toBeInTheDocument();
  });

  it("redirige vers upgrade lorsque le RPC refuse l'accès", () => {
    mockAuthenticatedUser();
    mockUseFleetSiteAccess.mockReturnValue({ data: false, isLoading: false });

    render(
      <MemoryRouter initialEntries={["/x"]}>
        <Routes>
          <Route
            path="/x"
            element={
              <PlanGuard>
                <div>Payant</div>
              </PlanGuard>
            }
          />
          <Route path="/upgrade" element={<div data-testid="up">Upgrade</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("up")).toBeInTheDocument();
  });
});
