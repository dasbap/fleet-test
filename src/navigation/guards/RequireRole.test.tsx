import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { RoleGuard } from "./RequireRole";

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

describe("RequireRole / RoleGuard", () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
    mockIsMockAuthEnabled.mockReset();
  });

  it("redirige vers /login lorsque la session mock est activée et qu’il n’y a pas d’utilisateur", () => {
    mockUseAuth.mockReturnValue({ user: null, role: null, isLoading: false });
    mockIsMockAuthEnabled.mockReturnValue(true);

    render(
      <MemoryRouter initialEntries={["/prot"]}>
        <Routes>
          <Route
            path="/prot"
            element={
              <RoleGuard allow={["organizer"]}>
                <div>Contenu rôle</div>
              </RoleGuard>
            }
          />
          <Route path="/login" element={<div data-testid="route-login">Connexion mobile</div>} />
          <Route path="/auth" element={<div data-testid="route-auth">Connexion web</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("route-login")).toBeInTheDocument();
    expect(screen.queryByText("Contenu rôle")).not.toBeInTheDocument();
  });

  it("redirige vers /auth lorsque la session mock est désactivée et qu’il n’y a pas d’utilisateur", () => {
    mockUseAuth.mockReturnValue({ user: null, role: null, isLoading: false });
    mockIsMockAuthEnabled.mockReturnValue(false);

    render(
      <MemoryRouter initialEntries={["/prot"]}>
        <Routes>
          <Route
            path="/prot"
            element={
              <RoleGuard allow={["organizer"]}>
                <div>Contenu rôle</div>
              </RoleGuard>
            }
          />
          <Route path="/login" element={<div data-testid="route-login">Connexion mobile</div>} />
          <Route path="/auth" element={<div data-testid="route-auth">Connexion web</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("route-auth")).toBeInTheDocument();
    expect(screen.queryByText("Contenu rôle")).not.toBeInTheDocument();
  });

  it("affiche les enfants lorsque l’utilisateur a un rôle autorisé", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "u1", email: "a@b.c" },
      role: "organizer",
      activeTenantContext: { orgId: "o1", fleetId: "f1", role: "organizer" },
      isLoading: false,
    });
    mockIsMockAuthEnabled.mockReturnValue(false);

    render(
      <MemoryRouter initialEntries={["/prot"]}>
        <Routes>
          <Route
            path="/prot"
            element={
              <RoleGuard allow={["organizer", "manager"]}>
                <div>Contenu rôle</div>
              </RoleGuard>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Contenu rôle")).toBeInTheDocument();
  });

  it("redirige vers fallbackWhenDriver lorsque conducteur non autorisé", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "u1", email: "a@b.c" },
      role: "driver",
      activeTenantContext: { orgId: "o1", fleetId: "f1", role: "driver" },
      isLoading: false,
    });
    mockIsMockAuthEnabled.mockReturnValue(false);

    render(
      <MemoryRouter initialEntries={["/prot"]}>
        <Routes>
          <Route
            path="/prot"
            element={
              <RoleGuard
                allow={["organizer"]}
                fallbackTo="/accueil"
                fallbackWhenDriver="/terrain-hub"
              >
                <div>Contenu rôle</div>
              </RoleGuard>
            }
          />
          <Route path="/terrain-hub" element={<div data-testid="terrain">Terrain</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("terrain")).toBeInTheDocument();
    expect(screen.queryByText("Contenu rôle")).not.toBeInTheDocument();
  });

  it("redirige vers fallbackTo lorsque le rôle n’est pas autorisé", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "u1", email: "a@b.c" },
      role: "driver",
      activeTenantContext: { orgId: "o1", fleetId: "f1", role: "driver" },
      isLoading: false,
    });
    mockIsMockAuthEnabled.mockReturnValue(false);

    render(
      <MemoryRouter initialEntries={["/prot"]}>
        <Routes>
          <Route
            path="/prot"
            element={
              <RoleGuard allow={["organizer"]} fallbackTo="/accueil">
                <div>Contenu rôle</div>
              </RoleGuard>
            }
          />
          <Route path="/accueil" element={<div data-testid="fallback">Accueil</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("fallback")).toBeInTheDocument();
    expect(screen.queryByText("Contenu rôle")).not.toBeInTheDocument();
  });

  it("affiche le chargement lorsque isLoading est vrai", () => {
    mockUseAuth.mockReturnValue({ user: null, role: null, isLoading: true });

    const { container } = render(
      <MemoryRouter>
        <RoleGuard allow={["organizer"]}>
          <div>Contenu rôle</div>
        </RoleGuard>
      </MemoryRouter>,
    );

    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
    expect(screen.queryByText("Contenu rôle")).not.toBeInTheDocument();
  });

  it("privilégie le rôle de la flotte active sur le rôle global", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "u1", email: "a@b.c" },
      role: "organizer",
      activeTenantContext: { orgId: "o1", fleetId: "f2", role: "driver" },
      isLoading: false,
    });
    mockIsMockAuthEnabled.mockReturnValue(false);

    render(
      <MemoryRouter initialEntries={["/prot"]}>
        <Routes>
          <Route
            path="/prot"
            element={
              <RoleGuard allow={["organizer"]} fallbackWhenDriver="/terrain-hub">
                <div>Contenu rôle</div>
              </RoleGuard>
            }
          />
          <Route path="/terrain-hub" element={<div data-testid="terrain">Terrain</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("terrain")).toBeInTheDocument();
    expect(screen.queryByText("Contenu rôle")).not.toBeInTheDocument();
  });
});
