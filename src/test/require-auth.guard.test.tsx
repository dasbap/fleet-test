import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { RequireAuth } from "@/navigation/guards/RequireAuth";

const useAuthMock = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: (...args: unknown[]) => useAuthMock(...args),
}));

vi.mock("@/lib/authMode", () => ({
  isMockAuthEnabled: () => false,
}));

vi.mock("@/hooks/useWaitForProfileReady", () => ({
  useWaitForProfileReady: () => ({
    status: "ready",
    isPending: false,
    isReady: true,
    timedOut: false,
  }),
}));

describe("RequireAuth", () => {
  it("redirige vers /auth quand l'utilisateur n'est pas connecté", () => {
    useAuthMock.mockReturnValue({
      user: null,
      isLoading: false,
    });

    render(
      <MemoryRouter initialEntries={["/dashboard/vehicles?tab=list"]}>
        <Routes>
          <Route
            path="/dashboard/vehicles"
            element={
              <RequireAuth>
                <div>page-protegee</div>
              </RequireAuth>
            }
          />
          <Route path="/auth" element={<div>page-auth</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("page-auth")).toBeInTheDocument();
    expect(screen.queryByText("page-protegee")).not.toBeInTheDocument();
  });
});
