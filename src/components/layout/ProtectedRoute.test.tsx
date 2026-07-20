import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import type { ReactNode } from "react";

const { mockUseRouteAccess, mockUseAuth } = vi.hoisted(() => ({
  mockUseRouteAccess: vi.fn(),
  mockUseAuth: vi.fn(),
}));

vi.mock("@/hooks/useRouteAccess", () => ({
  useRouteAccess: () => mockUseRouteAccess(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/navigation/guards/RequireAuth", () => ({
  RequireAuth: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

describe("ProtectedRoute", () => {
  beforeEach(() => {
    mockUseRouteAccess.mockReset();
    mockUseAuth.mockReset();
    mockUseAuth.mockReturnValue({
      activeTenantContext: { role: "driver" },
    });
  });

  it("redirige vers /start quand accès tenant_bootstrap", () => {
    mockUseRouteAccess.mockReturnValue({ state: "tenant_bootstrap" });

    render(
      <MemoryRouter initialEntries={["/dashboard/operations"]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard/operations" element={<div>Private</div>} />
          </Route>
          <Route path="/start" element={<div data-testid="start-page">Start</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("start-page")).toBeInTheDocument();
  });

  it("redirige vers /onboarding quand accès onboarding", () => {
    mockUseRouteAccess.mockReturnValue({ state: "onboarding" });

    render(
      <MemoryRouter initialEntries={["/dashboard/operations"]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard/operations" element={<div>Private</div>} />
          </Route>
          <Route
            path="/onboarding"
            element={<div data-testid="onboarding-page">Onboarding</div>}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("onboarding-page")).toBeInTheDocument();
  });

  it("redirige vers /dashboard si rôle non autorisé", () => {
    mockUseRouteAccess.mockReturnValue({ state: "ready" });

    render(
      <MemoryRouter initialEntries={["/dashboard/operations"]}>
        <Routes>
          <Route element={<ProtectedRoute allowedRoles={["organizer"]} />}>
            <Route path="/dashboard/operations" element={<div>Private</div>} />
          </Route>
          <Route path="/dashboard" element={<div data-testid="dashboard-page">Dashboard</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("dashboard-page")).toBeInTheDocument();
  });
});
