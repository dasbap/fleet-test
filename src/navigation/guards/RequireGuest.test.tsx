import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { RequireGuest } from "./RequireGuest";

const { mockUseAuth, mockUseAuthFlow } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockUseAuthFlow: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/hooks/useAuthFlow", () => ({
  useAuthFlow: () => mockUseAuthFlow(),
}));

describe("RequireGuest", () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
    mockUseAuthFlow.mockReset();
    mockUseAuthFlow.mockReturnValue({
      isReady: true,
      isLoading: false,
      decision: { path: "/dashboard", reason: "default_next" as const },
    });
  });

  it("affiche un chargement lorsque isLoading est vrai", () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: true });
    const { container } = render(
      <MemoryRouter>
        <RequireGuest>
          <div>Formulaire invité</div>
        </RequireGuest>
      </MemoryRouter>,
    );
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
    expect(screen.queryByText("Formulaire invité")).not.toBeInTheDocument();
  });

  it("affiche les enfants lorsque visiteur non authentifié", () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false });
    render(
      <MemoryRouter>
        <RequireGuest>
          <div>Formulaire invité</div>
        </RequireGuest>
      </MemoryRouter>,
    );
    expect(screen.getByText("Formulaire invité")).toBeInTheDocument();
  });

  it("redirige vers la décision useAuthFlow lorsque déjà connecté", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "u1", email: "a@b.c" },
      isLoading: false,
    });
    mockUseAuthFlow.mockReturnValue({
      isReady: true,
      isLoading: false,
      decision: { path: "/dashboard", reason: "default_next" },
    });
    render(
      <MemoryRouter initialEntries={["/guest"]}>
        <Routes>
          <Route
            path="/guest"
            element={
              <RequireGuest>
                <div>Formulaire invité</div>
              </RequireGuest>
            }
          />
          <Route path="/dashboard" element={<div data-testid="dashboard">Tableau</div>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByTestId("dashboard")).toBeInTheDocument();
    expect(screen.queryByText("Formulaire invité")).not.toBeInTheDocument();
  });

  it("redirige vers la cible dérivée du flux (ex. réglages) lorsque déjà connecté", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "u1", email: "a@b.c" },
      isLoading: false,
    });
    mockUseAuthFlow.mockReturnValue({
      isReady: true,
      isLoading: false,
      decision: { path: "/dashboard/settings", reason: "default_next" },
    });
    render(
      <MemoryRouter initialEntries={["/guest?redirect=/dashboard/settings"]}>
        <Routes>
          <Route
            path="/guest"
            element={
              <RequireGuest>
                <div>Formulaire invité</div>
              </RequireGuest>
            }
          />
          <Route
            path="/dashboard/settings"
            element={<div data-testid="settings">Réglages</div>}
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByTestId("settings")).toBeInTheDocument();
  });

  it("affiche un chargement lorsque connecté mais le flux n’est pas prêt", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "u1", email: "a@b.c" },
      isLoading: false,
    });
    mockUseAuthFlow.mockReturnValue({ isReady: false, isLoading: true, decision: null });
    const { container } = render(
      <MemoryRouter>
        <RequireGuest>
          <div>Formulaire invité</div>
        </RequireGuest>
      </MemoryRouter>,
    );
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
    expect(screen.queryByText("Formulaire invité")).not.toBeInTheDocument();
  });
});
