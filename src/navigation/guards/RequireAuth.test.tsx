import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { RequireAuth } from "./RequireAuth";

const { mockUseAuth, mockIsMockAuthEnabled } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockIsMockAuthEnabled: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/lib/authMode", () => ({
  isMockAuthEnabled: () => mockIsMockAuthEnabled(),
}));

describe("RequireAuth", () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
    mockIsMockAuthEnabled.mockReset();
  });

  it("redirige vers /login lorsque la session mock est activée et qu’il n’y a pas d’utilisateur", () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false });
    mockIsMockAuthEnabled.mockReturnValue(true);

    render(
      <MemoryRouter initialEntries={["/prot"]}>
        <Routes>
          <Route
            path="/prot"
            element={
              <RequireAuth>
                <div>Contenu protégé</div>
              </RequireAuth>
            }
          />
          <Route path="/login" element={<div data-testid="route-login">Connexion mobile</div>} />
          <Route path="/auth" element={<div data-testid="route-auth">Connexion web</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("route-login")).toBeInTheDocument();
    expect(screen.queryByText("Contenu protégé")).not.toBeInTheDocument();
  });

  it("redirige vers /auth lorsque la session mock est désactivée et qu’il n’y a pas d’utilisateur", () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false });
    mockIsMockAuthEnabled.mockReturnValue(false);

    render(
      <MemoryRouter initialEntries={["/prot"]}>
        <Routes>
          <Route
            path="/prot"
            element={
              <RequireAuth>
                <div>Contenu protégé</div>
              </RequireAuth>
            }
          />
          <Route path="/login" element={<div data-testid="route-login">Connexion mobile</div>} />
          <Route path="/auth" element={<div data-testid="route-auth">Connexion web</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("route-auth")).toBeInTheDocument();
    expect(screen.queryByText("Contenu protégé")).not.toBeInTheDocument();
  });

  it("affiche les enfants lorsque l’utilisateur est connecté", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "u1", email: "a@b.c" },
      isLoading: false,
    });
    mockIsMockAuthEnabled.mockReturnValue(false);

    render(
      <MemoryRouter initialEntries={["/prot"]}>
        <Routes>
          <Route
            path="/prot"
            element={
              <RequireAuth>
                <div>Contenu protégé</div>
              </RequireAuth>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Contenu protégé")).toBeInTheDocument();
  });

  it("affiche le chargement lorsque isLoading est vrai", () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: true });

    const { container } = render(
      <MemoryRouter>
        <RequireAuth>
          <div>Contenu protégé</div>
        </RequireAuth>
      </MemoryRouter>,
    );

    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
    expect(screen.queryByText("Contenu protégé")).not.toBeInTheDocument();
  });
});
