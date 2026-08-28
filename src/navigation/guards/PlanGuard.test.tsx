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

function allowedAccess(data: boolean) {
  return {
    data,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  };
}

describe("PlanGuard", () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
    mockUseFleetSiteAccess.mockReset();
  });

  it("affiche les enfants lorsque le RPC autorise l'accès", () => {
    mockAuthenticatedUser();
    mockUseFleetSiteAccess.mockReturnValue(allowedAccess(true));

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
    mockUseFleetSiteAccess.mockReturnValue(allowedAccess(true));

    render(
      <MemoryRouter>
        <PlanGuard>
          <div data-testid="driver-access">Dashboard</div>
        </PlanGuard>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("driver-access")).toBeInTheDocument();
  });

  it("redirige vers upgrade lorsque le RPC refuse explicitement l'accès", () => {
    mockAuthenticatedUser();
    mockUseFleetSiteAccess.mockReturnValue(allowedAccess(false));

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

  it("ne transforme pas une erreur RPC en faux besoin d'upgrade", () => {
    mockAuthenticatedUser();
    mockUseFleetSiteAccess.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: vi.fn(),
    });

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

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Impossible de vérifier l’accès à cette flotte.",
    );
    expect(screen.queryByTestId("up")).not.toBeInTheDocument();
  });

  it("ne contourne pas le refus d'accès avec un faux retour Notch Pay", () => {
    mockAuthenticatedUser();
    mockUseFleetSiteAccess.mockReturnValue(allowedAccess(false));

    render(
      <MemoryRouter initialEntries={["/dashboard/billing?status=success&ref=fake"]}>
        <Routes>
          <Route
            path="/dashboard/billing"
            element={
              <PlanGuard>
                <div data-testid="billing">Facturation</div>
              </PlanGuard>
            }
          />
          <Route path="/upgrade" element={<div data-testid="up">Upgrade</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("up")).toBeInTheDocument();
    expect(screen.queryByTestId("billing")).not.toBeInTheDocument();
  });
});
