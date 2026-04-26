import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import { appRoutes } from "@/app/routes/app.routes";

vi.mock("@/app/RootLayout", () => ({
  RootLayout: () => (
    <div data-testid="root-layout">
      <Outlet />
    </div>
  ),
}));

vi.mock("@/components/auth/AuthProviderLayout", () => ({
  default: () => (
    <div data-testid="auth-provider-layout">
      <Outlet />
    </div>
  ),
}));

vi.mock("@/features/auth/routes", () => ({
  authPublicRoutes: (
    <Route path="/auth" element={<div data-testid="auth-page">Auth</div>} />
  ),
}));

vi.mock("@/app/routes/dashboard.routes", () => ({
  dashboardRoutes: (
    <Route path="/dashboard">
      <Route path="maintenance" element={<div data-testid="dashboard-maintenance">Maintenance</div>} />
      <Route path="*" element={<div data-testid="dashboard-fallback">Dashboard</div>} />
    </Route>
  ),
}));

vi.mock("@/components/layout/ProtectedRoute", () => ({
  ProtectedRoute: () => <Outlet />,
}));

vi.mock("@/navigation/guards/RequireRole", () => ({
  RoleGuard: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/layouts/TerrainLayout", () => ({
  default: () => <Outlet />,
}));

vi.mock("@/features/terrain/screens/TerrainPage", () => ({
  default: () => <div data-testid="terrain-page">Terrain</div>,
}));

vi.mock("@/pages/Scan", () => ({
  default: () => <div data-testid="scan-page">Scan</div>,
}));

vi.mock("@/pages/Index", () => ({
  default: () => <div>Index</div>,
}));

vi.mock("@/pages/Aide", () => ({
  default: () => <div>Aide</div>,
}));

vi.mock("@/app/routes/LegacyAideVideoRedirect", () => ({
  LegacyAideVideoRedirect: () => <div>Legacy video</div>,
}));

vi.mock("@/components/auth/OnboardingRoute", () => ({
  OnboardingRoute: () => <div>Onboarding</div>,
}));

vi.mock("@/components/auth/TenantBootstrapRoute", () => ({
  TenantBootstrapRoute: () => <div>Tenant bootstrap</div>,
}));

vi.mock("@/pages/PostLoginGate", () => ({
  default: () => <div>Post login</div>,
}));

vi.mock("@/pages/Upgrade", () => ({
  default: () => <div data-testid="upgrade-page">Upgrade</div>,
}));

vi.mock("@/features/fuel/screens/FuelMonitoringPage", () => ({
  default: () => <div data-testid="fuel-page">Fuel</div>,
}));

vi.mock("@/features/inspections/screens/DvirInspectionsPage", () => ({
  default: () => <div data-testid="inspections-page">Inspections</div>,
}));

vi.mock("@/features/inspections/screens/DvirDetailPage", () => ({
  default: () => <div data-testid="inspections-detail-page">Inspections detail</div>,
}));

vi.mock("@/features/transit/screens/TransitCemacPage", () => ({
  default: () => <div data-testid="transit-page">Transit</div>,
}));

vi.mock("@/features/transit/screens/TransitDetailPage", () => ({
  default: () => <div data-testid="transit-detail-page">Transit detail</div>,
}));

vi.mock("@/features/maintenance/screens/PredictiveMaintenancePage", () => ({
  default: () => <div data-testid="predictive-maintenance-page">Predictive maintenance</div>,
}));

vi.mock("@/pages/NotFound", () => ({
  default: () => <div data-testid="not-found">Not found</div>,
}));

function renderRoutes(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>{appRoutes}</Routes>
    </MemoryRouter>,
  );
}

describe("app.routes redirections critiques", () => {
  it("redirige /maintenance vers /dashboard/maintenance", async () => {
    renderRoutes("/maintenance");
    expect(await screen.findByTestId("dashboard-maintenance")).toBeInTheDocument();
  });

  it("redirige /connexion vers /auth", async () => {
    renderRoutes("/connexion");
    expect(await screen.findByTestId("auth-page")).toBeInTheDocument();
  });
});

describe("app.routes routes métier racine", () => {
  it("rend /fuel", async () => {
    renderRoutes("/fuel");
    expect(await screen.findByTestId("fuel-page")).toBeInTheDocument();
  });

  it("rend /inspections", async () => {
    renderRoutes("/inspections");
    expect(await screen.findByTestId("inspections-page")).toBeInTheDocument();
  });

  it("rend /inspections/*", async () => {
    renderRoutes("/inspections/vehicule-123");
    expect(await screen.findByTestId("inspections-detail-page")).toBeInTheDocument();
  });

  it("rend /transit", async () => {
    renderRoutes("/transit");
    expect(await screen.findByTestId("transit-page")).toBeInTheDocument();
  });

  it("rend /transit/*", async () => {
    renderRoutes("/transit/expedition-abc");
    expect(await screen.findByTestId("transit-detail-page")).toBeInTheDocument();
  });

  it("rend /maintenance/predictive", async () => {
    renderRoutes("/maintenance/predictive");
    expect(
      await screen.findByTestId("predictive-maintenance-page"),
    ).toBeInTheDocument();
  });

  it("conserve le fallback not-found", async () => {
    renderRoutes("/route-inconnue");
    expect(await screen.findByTestId("not-found")).toBeInTheDocument();
  });
});
