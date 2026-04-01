import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { RequireGuest } from "./RequireGuest";

const { mockUseAuth } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

describe("RequireGuest", () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
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

  it("redirige vers /dashboard lorsque déjà connecté", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "u1", email: "a@b.c" },
      isLoading: false,
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

  it("redirige vers redirect interne lorsque déjà connecté", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "u1", email: "a@b.c" },
      isLoading: false,
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
});
