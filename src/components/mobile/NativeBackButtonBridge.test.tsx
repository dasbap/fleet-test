import { act, render, waitFor } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { NativeBackButtonBridge } from "@/components/mobile/NativeBackButtonBridge";
import { ROUTE_PATHS } from "@/navigation/routePaths";

type BackButtonListener = (event: { canGoBack: boolean }) => void;

const remove = vi.fn();
const minimizeApp = vi.fn().mockResolvedValue(undefined);
const addListener = vi.fn((_eventName: string, listener: BackButtonListener) => {
  capturedBackButtonListener = listener;
  return Promise.resolve({ remove });
});

let capturedBackButtonListener: BackButtonListener | null = null;

vi.mock("@/lib/platform", () => ({
  isNativePlatform: () => true,
}));

vi.mock("@capacitor/app", () => ({
  App: {
    addListener,
    minimizeApp,
  },
}));

describe("NativeBackButtonBridge", () => {
  beforeEach(() => {
    capturedBackButtonListener = null;
    addListener.mockClear();
    minimizeApp.mockClear();
    remove.mockClear();
  });

  it("minimise l'app native au lieu de fermer la WebView quand il n'y a pas d'historique", async () => {
    render(
      <MemoryRouter initialEntries={[ROUTE_PATHS.dashboard]}>
        <NativeBackButtonBridge />
        <Routes>
          <Route path={ROUTE_PATHS.dashboard} element={<p>Dashboard</p>} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(addListener).toHaveBeenCalledWith("backButton", expect.any(Function)));

    act(() => {
      capturedBackButtonListener?.({ canGoBack: false });
    });

    expect(minimizeApp).toHaveBeenCalledTimes(1);
  });

  it("utilise l'historique interne quand une page precedente existe", async () => {
    const back = vi.spyOn(window.history, "back").mockImplementation(() => {});
    window.history.replaceState({ idx: 1 }, "");

    render(
      <MemoryRouter initialEntries={[ROUTE_PATHS.dashboard, ROUTE_PATHS.dashboardAlerts]} initialIndex={1}>
        <NativeBackButtonBridge />
        <Routes>
          <Route path={ROUTE_PATHS.dashboardAlerts} element={<p>Alertes</p>} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(addListener).toHaveBeenCalledWith("backButton", expect.any(Function)));

    act(() => {
      capturedBackButtonListener?.({ canGoBack: true });
    });

    expect(back).toHaveBeenCalledTimes(1);
    expect(minimizeApp).not.toHaveBeenCalled();

    back.mockRestore();
  });

  it("ramene le lecteur tutoriel vers la liste des tutoriels", async () => {
    const tutorialPath = ROUTE_PATHS.dashboardTutorialDetail("tuto-1");
    const { findByText } = render(
      <MemoryRouter initialEntries={[tutorialPath]}>
        <NativeBackButtonBridge />
        <Routes>
          <Route path={`${ROUTE_PATHS.dashboardTutorials}/:tutorialId`} element={<p>Lecteur</p>} />
          <Route
            path={ROUTE_PATHS.dashboardTutorials}
            element={
              <div>
                <p>Liste tutoriels</p>
                <Link to={tutorialPath}>Ouvrir</Link>
              </div>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(addListener).toHaveBeenCalledWith("backButton", expect.any(Function)));

    act(() => {
      capturedBackButtonListener?.({ canGoBack: false });
    });

    expect(await findByText("Liste tutoriels")).toBeInTheDocument();
    expect(minimizeApp).not.toHaveBeenCalled();
  });
});
