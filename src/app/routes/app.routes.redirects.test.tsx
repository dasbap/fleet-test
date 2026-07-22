import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import { appRoutes } from "@/app/routes/app.routes";

const mockUseAuth = vi.fn();

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

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/features/auth/routes", () => ({
  authPublicRoutes: (
    <Route path="/auth" element={<div data-testid="auth-page">Auth</div>} />
  ),
}));

vi.mock("@/pages/DemoMagicLinkPage", () => ({
  default: () => <div data-testid="demo-magic-link-page">Demo access</div>,
}));

vi.mock("@/features/demo/ProspectOnboarding", () => ({
  ProspectOnboarding: () => <div data-testid="demo-onboarding-page">Demo onboarding</div>,
}));

vi.mock("@/app/routes/dashboard.routes", () => ({
  dashboardRoutes: (
    <Route path="/dashboard">
      <Route index element={<div data-testid="dashboard-fallback">Dashboard</div>} />
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
  default: () => <div data-testid="index-page">Index</div>,
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

vi.mock("@/features/inspections/screens/DvirChecklistPage", () => ({
  default: () => <div data-testid="inspections-checklist-page">Inspections checklist</div>,
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

vi.mock("@/pages/Pricing", () => ({
  default: () => <div data-testid="pricing-page">Pricing</div>,
}));

vi.mock("@/pages/public/FonctionnalitesPage", () => ({
  default: () => <div data-testid="fonctionnalites-page">Fonctionnalites</div>,
}));

vi.mock("@/pages/public/FonctionnaliteSectionPage", () => ({
  default: ({ slug }: { slug: string }) => (
    <div data-testid={`fonctionnalites-section-${slug}`}>{slug}</div>
  ),
}));

vi.mock("@/pages/public/FaqPage", () => ({
  default: () => <div data-testid="faq-page">FAQ</div>,
}));

vi.mock("@/pages/public/ContactPage", () => ({
  default: () => <div data-testid="contact-page">Contact</div>,
}));

vi.mock("@/features/help/screens/HelpQuickStartPage", () => ({
  default: () => <div data-testid="help-quickstart-page">Quickstart</div>,
}));

vi.mock("@/pages/Confidentialite", () => ({
  default: () => <div data-testid="confidentialite-page">Confidentialite</div>,
}));

vi.mock("@/pages/Conditions", () => ({
  default: () => <div data-testid="conditions-page">Conditions</div>,
}));

vi.mock("@/features/help/components/HelpPublicLayout", () => ({
  HelpPublicLayout: () => <Outlet />,
}));

vi.mock("@/features/help/screens/HelpHomePage", () => ({
  default: () => <div data-testid="help-home-page">Help</div>,
}));

function renderRoutes(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>{appRoutes}</Routes>
    </MemoryRouter>,
  );
}

describe("app.routes redirections critiques", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false });
  });

  it("rend / pour un visiteur non connecte", async () => {
    renderRoutes("/");
    expect(await screen.findByTestId("index-page")).toBeInTheDocument();
  });

  it("redirige / vers /dashboard quand une session est active", async () => {
    mockUseAuth.mockReturnValue({
      user: { id: "user-1", email: "demo@esamba.test" },
      isLoading: false,
    });

    renderRoutes("/");
    expect(await screen.findByTestId("dashboard-fallback")).toBeInTheDocument();
  });

  it("redirige /maintenance vers /dashboard/maintenance", async () => {
    renderRoutes("/maintenance");
    expect(await screen.findByTestId("dashboard-maintenance")).toBeInTheDocument();
  });

  it("redirige /connexion vers /auth", async () => {
    renderRoutes("/connexion");
    expect(await screen.findByTestId("auth-page")).toBeInTheDocument();
  });

  it("redirige /inscription vers la demande d'accès", async () => {
    renderRoutes("/inscription");
    expect(await screen.findByTestId("contact-page")).toBeInTheDocument();
  });

  it("redirige /privacy vers /confidentialite", async () => {
    renderRoutes("/privacy");
    expect(await screen.findByTestId("confidentialite-page")).toBeInTheDocument();
  });

  it("redirige /terms vers /conditions", async () => {
    renderRoutes("/terms");
    expect(await screen.findByTestId("conditions-page")).toBeInTheDocument();
  });

  it("redirige /documentation vers /help", async () => {
    renderRoutes("/documentation");
    expect(await screen.findByTestId("help-home-page")).toBeInTheDocument();
  });

  it("redirige /api vers /help", async () => {
    renderRoutes("/api");
    expect(await screen.findByTestId("help-home-page")).toBeInTheDocument();
  });

  it("redirige /demo vers /contact", async () => {
    renderRoutes("/demo");
    expect(await screen.findByTestId("contact-page")).toBeInTheDocument();
  });

  it("rend le point d'entree magic link demo sans le rediriger vers la demande demo", async () => {
    renderRoutes("/demo/access?token=00000000-0000-4000-8000-000000000001");
    expect(await screen.findByTestId("demo-magic-link-page")).toBeInTheDocument();
  });

  it("rend l'onboarding demo utilise apres validation du magic link", async () => {
    renderRoutes("/demo/onboarding");
    expect(await screen.findByTestId("demo-onboarding-page")).toBeInTheDocument();
  });

  it("redirige /help/faq vers /faq", async () => {
    renderRoutes("/help/faq");
    expect(await screen.findByTestId("faq-page")).toBeInTheDocument();
  });

  it("redirige /help/guides vers /help/quickstart", async () => {
    renderRoutes("/help/guides");
    expect(await screen.findByTestId("help-quickstart-page")).toBeInTheDocument();
  });

  it("redirige /guides vers /help", async () => {
    renderRoutes("/guides");
    expect(await screen.findByTestId("help-home-page")).toBeInTheDocument();
  });

  it("redirige /features vers /fonctionnalites", async () => {
    renderRoutes("/features");
    expect(await screen.findByTestId("fonctionnalites-page")).toBeInTheDocument();
  });

  it("redirige /vehicles/new vers le dashboard véhicules", async () => {
    renderRoutes("/vehicles/new");
    expect(await screen.findByTestId("dashboard-fallback")).toBeInTheDocument();
  });

  it("redirige /tarifs vers /pricing", async () => {
    renderRoutes("/tarifs");
    expect(await screen.findByTestId("pricing-page")).toBeInTheDocument();
  });
});

describe("app.routes routes métier racine", () => {
  it("rend la page fille unique de fonctionnalites", async () => {
    renderRoutes("/fonctionnalites/piloter-flotte");
    expect(await screen.findByTestId("fonctionnalites-section-piloter-flotte")).toBeInTheDocument();
  });

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
