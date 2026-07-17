import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";

const subscribeMock = vi.fn(() => vi.fn());

vi.mock("@/services/realtime-fleet-subscription.service", () => ({
  realtimeFleetSubscriptionService: {
    subscribe: subscribeMock,
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient();
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useRealtimeNotifications", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    subscribeMock.mockClear();
  });

  it("decale la souscription Realtime apres le delai et l'idle", async () => {
    vi.useFakeTimers();
    const requestIdleCallback = vi.fn((callback: IdleRequestCallback) => {
      callback({ didTimeout: false, timeRemaining: () => 8 });
      return 1;
    });
    vi.stubGlobal("requestIdleCallback", requestIdleCallback);

    renderHook(() => useRealtimeNotifications("fleet-1"), { wrapper });

    expect(subscribeMock).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1_499);
    expect(subscribeMock).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    await vi.waitFor(() => {
      expect(requestIdleCallback).toHaveBeenCalled();
      expect(subscribeMock).toHaveBeenCalledTimes(1);
    });
  });

  it("annule la souscription si le layout est demonte avant l'idle", async () => {
    vi.useFakeTimers();

    const { unmount } = renderHook(() => useRealtimeNotifications("fleet-1"), { wrapper });
    unmount();

    await vi.advanceTimersByTimeAsync(1_500);

    expect(subscribeMock).not.toHaveBeenCalled();
  });
});
