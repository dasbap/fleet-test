import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PullToRefresh } from "@/components/mobile/PullToRefresh";

type AppStateListener = (state: { isActive: boolean }) => void;

const remove = vi.fn();
const addListener = vi.fn((_eventName: string, listener: AppStateListener) => {
  capturedAppStateListener = listener;
  return Promise.resolve({ remove });
});

let capturedAppStateListener: AppStateListener | null = null;

vi.mock("@/lib/platform", () => ({
  isNativePlatform: () => true,
}));

vi.mock("@capacitor/app", () => ({
  App: {
    addListener,
  },
}));

describe("PullToRefresh", () => {
  beforeEach(() => {
    capturedAppStateListener = null;
    addListener.mockClear();
    remove.mockClear();
  });

  it("annule le geste de refresh quand l'app native revient d'arriere-plan", async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);

    render(
      <PullToRefresh onRefresh={onRefresh}>
        <p>Accueil mobile</p>
      </PullToRefresh>,
    );

    const container = screen.getByText("Accueil mobile").parentElement;
    expect(container).not.toBeNull();

    await waitFor(() => expect(addListener).toHaveBeenCalledWith("appStateChange", expect.any(Function)));

    act(() => {
      fireEvent.touchStart(container!, { touches: [{ clientY: 0 }] });
      fireEvent.touchMove(container!, { touches: [{ clientY: 100 }] });
    });

    act(() => {
      capturedAppStateListener?.({ isActive: false });
      capturedAppStateListener?.({ isActive: true });
    });

    act(() => {
      fireEvent.touchEnd(container!);
    });

    expect(onRefresh).not.toHaveBeenCalled();
  });

  it("conserve le refresh tactile quand le geste est volontaire", async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);

    render(
      <PullToRefresh onRefresh={onRefresh}>
        <p>Accueil mobile</p>
      </PullToRefresh>,
    );

    const container = screen.getByText("Accueil mobile").parentElement;
    expect(container).not.toBeNull();

    act(() => {
      fireEvent.touchStart(container!, { touches: [{ clientY: 0 }] });
      fireEvent.touchMove(container!, { touches: [{ clientY: 100 }] });
    });

    await act(async () => {
      fireEvent.touchEnd(container!);
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
