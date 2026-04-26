import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { OnboardingRoute } from "@/components/auth/OnboardingRoute";
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

vi.mock("@/components/onboarding/OnboardingWizard", () => ({
  OnboardingWizard: () => <div data-testid="onboarding-wizard">Wizard</div>,
}));

describe("OnboardingRoute", () => {
  beforeEach(() => {
    mockUseRouteAccess.mockReset();
    mockUseAuth.mockReset();
    mockUseAuth.mockReturnValue({ orgId: "org-1" });
  });

  it("redirige vers /start quand accès tenant_bootstrap", () => {
    mockUseRouteAccess.mockReturnValue({ state: "tenant_bootstrap" });

    render(
      <MemoryRouter initialEntries={["/onboarding"]}>
        <Routes>
          <Route path="/onboarding" element={<OnboardingRoute />} />
          <Route path="/start" element={<div data-testid="start-page">Start</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("start-page")).toBeInTheDocument();
  });

  it("redirige vers /start si onboarding sans orgId", () => {
    mockUseRouteAccess.mockReturnValue({ state: "onboarding" });
    mockUseAuth.mockReturnValue({ orgId: null });

    render(
      <MemoryRouter initialEntries={["/onboarding"]}>
        <Routes>
          <Route path="/onboarding" element={<OnboardingRoute />} />
          <Route path="/start" element={<div data-testid="start-page">Start</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("start-page")).toBeInTheDocument();
  });

  it("affiche le wizard si onboarding avec orgId", () => {
    mockUseRouteAccess.mockReturnValue({ state: "onboarding" });

    render(
      <MemoryRouter initialEntries={["/onboarding"]}>
        <Routes>
          <Route path="/onboarding" element={<OnboardingRoute />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("onboarding-wizard")).toBeInTheDocument();
  });
});
