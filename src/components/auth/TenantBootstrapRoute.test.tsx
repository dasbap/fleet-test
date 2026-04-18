import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import type { ReactNode } from "react";
import { TenantBootstrapRoute } from "@/components/auth/TenantBootstrapRoute";

const useAuthMock = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("@/navigation/guards/RequireAuth", () => ({
  RequireAuth: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/pages/CreateFleet", () => ({
  default: () => <div>create-fleet-screen</div>,
}));

describe("TenantBootstrapRoute", () => {
  it("affiche la création de flotte sans tenant actif", () => {
    useAuthMock.mockReturnValue({
      memberships: [],
      activeTenantContext: null,
    });

    render(
      <MemoryRouter initialEntries={["/start"]}>
        <TenantBootstrapRoute />
      </MemoryRouter>
    );

    expect(screen.getByText("create-fleet-screen")).toBeInTheDocument();
  });

  it("redirige vers dashboard si tenant actif", () => {
    useAuthMock.mockReturnValue({
      memberships: [{ fleet_id: "fleet-1" }],
      activeTenantContext: { orgId: "org-1", fleetId: "fleet-1", role: "manager" },
    });

    render(
      <MemoryRouter initialEntries={["/start"]}>
        <Routes>
          <Route path="/start" element={<TenantBootstrapRoute />} />
          <Route path="/dashboard" element={<div>dashboard-screen</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("dashboard-screen")).toBeInTheDocument();
  });
});
