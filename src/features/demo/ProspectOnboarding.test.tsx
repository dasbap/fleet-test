import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProspectOnboarding } from "@/features/demo/ProspectOnboarding";

const mocks = vi.hoisted(() => {
  const getUserMock = vi.fn();
  const exchangeCodeForSessionMock = vi.fn();
  const setSessionMock = vi.fn();
  const insertMock = vi.fn().mockResolvedValue({ error: null });
  const maybeSingleMock = vi.fn();
  const eqMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
  const selectMock = vi.fn(() => ({ eq: eqMock }));
  const fromMock = vi.fn((table: string) => {
    if (table === "demo_onboarding_logs") {
      return { insert: insertMock };
    }
    return { select: selectMock };
  });

  return {
    getUserMock,
    exchangeCodeForSessionMock,
    setSessionMock,
    insertMock,
    maybeSingleMock,
    eqMock,
    selectMock,
    fromMock,
  };
});

const {
  getUserMock,
  exchangeCodeForSessionMock,
  setSessionMock,
  insertMock,
  maybeSingleMock,
  eqMock,
  selectMock,
  fromMock,
} = mocks;

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: mocks.getUserMock,
      exchangeCodeForSession: mocks.exchangeCodeForSessionMock,
      setSession: mocks.setSessionMock,
    },
    from: mocks.fromMock,
  },
}));

describe("ProspectOnboarding", () => {
  beforeEach(() => {
    window.history.replaceState({}, document.title, "/");
    getUserMock.mockReset();
    exchangeCodeForSessionMock.mockReset();
    setSessionMock.mockReset();
    insertMock.mockClear();
    maybeSingleMock.mockReset();
    eqMock.mockClear();
    selectMock.mockClear();
    fromMock.mockClear();
  });

  it("ne laisse pas continuer vers le dashboard sans session Supabase", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    render(
      <MemoryRouter initialEntries={["/demo/onboarding"]}>
        <ProspectOnboarding />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Connexion demo incomplete")).toBeInTheDocument();
    expect(screen.queryByText(/Acceder au dashboard/i)).not.toBeInTheDocument();
  });

  it("accepte le retour magic link Supabase en fragment d'URL", async () => {
    setSessionMock.mockResolvedValue({ error: null });
    getUserMock.mockResolvedValue({
      data: { user: { id: "demo-user-1", email: "demo@example.com" } },
    });
    maybeSingleMock.mockResolvedValue({
      data: {
        user_id: "demo-user-1",
        email: "demo@example.com",
        demo_role: "driver",
        fleet_id: "fleet-1",
        account_type: "prospect",
        expires_at: null,
        flottes: { name: "Forfait Starter" },
      },
    });

    window.history.replaceState(
      {},
      document.title,
      "/demo/onboarding#access_token=access-token&refresh_token=refresh-token&type=magiclink",
    );

    render(
      <MemoryRouter initialEntries={["/demo/onboarding#access_token=access-token&refresh_token=refresh-token&type=magiclink"]}>
        <ProspectOnboarding />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Bienvenue sur E-Samba/i)).toBeInTheDocument();
    expect(setSessionMock).toHaveBeenCalledWith({
      access_token: "access-token",
      refresh_token: "refresh-token",
    });
    expect(screen.queryByText("Connexion demo incomplete")).not.toBeInTheDocument();
  });
});
