import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentType } from "react";
import * as authActions from "@/lib/auth-actions";
import { ROUTE_PATHS } from "@/navigation/routePaths";

let AuthPage: ComponentType;

const toastMock = vi.fn();

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock("@/lib/authMode", () => ({
  isMockAuthEnabled: () => false,
}));

vi.mock("@/components/auth/InvitationCodeInput", () => ({
  InvitationCodeInput: () => <div data-testid="invitation-code-stub" />,
}));

const navigateMock = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const mod = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...mod,
    useNavigate: () => navigateMock,
  };
});

vi.mock("@/lib/auth-actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  requestPasswordReset: vi.fn(),
  updateCurrentUserPassword: vi.fn(),
}));

function renderAuth(initialPath = "/auth") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthPage />
    </MemoryRouter>
  );
}

describe("AuthPage", () => {
  beforeAll(async () => {
    vi.stubEnv("VITE_ENABLE_DEMO_UI", "true");
    vi.stubEnv("VITE_DEMO_PASSWORD", "demo-test-password");
    const mod = await import("./AuthPage");
    AuthPage = mod.default;
  });

  beforeEach(() => {
    toastMock.mockReset();
    navigateMock.mockReset();
    vi.mocked(authActions.signIn).mockReset();
    vi.mocked(authActions.signUp).mockReset();
    vi.mocked(authActions.signIn).mockResolvedValue({
      data: {} as never,
      error: null,
    });
  });

  it("appelle signIn puis navigate vers /post-login apres connexion reussie", async () => {
    renderAuth("/auth");

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Mot de passe"), {
      target: { value: "secretpass" },
    });
    fireEvent.click(screen.getByRole("button", { name: /se connecter/i }));

    await waitFor(() => {
      expect(authActions.signIn).toHaveBeenCalledWith(
        "user@example.com",
        "secretpass",
        undefined
      );
    });
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith(
        `/post-login?next=${encodeURIComponent(ROUTE_PATHS.dashboard)}`
      );
    });
  }, 10000);

  it("preserve le parametre next securise vers /post-login", async () => {
    const nextPath = "/dashboard/vehicles";
    renderAuth(`/auth?next=${encodeURIComponent(nextPath)}`);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Mot de passe"), {
      target: { value: "secretpass" },
    });
    fireEvent.click(screen.getByRole("button", { name: /se connecter/i }));

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith(
        `/post-login?next=${encodeURIComponent(nextPath)}`
      );
    });
  });

  it("affiche un toast d'erreur et ne navigue pas si signIn echoue", async () => {
    vi.mocked(authActions.signIn).mockResolvedValue({
      data: null,
      error: { message: "Invalid login credentials" } as never,
    });

    renderAuth("/auth");

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "bad@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Mot de passe"), {
      target: { value: "wrong" },
    });
    fireEvent.click(screen.getByRole("button", { name: /se connecter/i }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Erreur de connexion",
          variant: "destructive",
        })
      );
    });
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("en mode ?mode=signup garde la creation publique desactivee", () => {
    renderAuth("/auth?mode=signup");

    expect(
      screen.getByRole("heading", { name: /bon retour/i })
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Organisation")).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("invitation-code-stub")
    ).not.toBeInTheDocument();
  });
});
