import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetRealtimeWorkerForTests, useRealtimeWorker } from "@/hooks/useRealtimeWorker";

const { mockGetSession, mockAuthUnsubscribe } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockAuthUnsubscribe: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: mockAuthUnsubscribe } },
      })),
    },
  },
}));

describe("useRealtimeWorker", () => {
  let postMessageSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    resetRealtimeWorkerForTests();
    postMessageSpy = vi.fn();

    mockGetSession.mockResolvedValue({
      data: { session: { access_token: "tok-1" } },
    });

    class MockSharedWorker {
      port = {
        start: vi.fn(),
        postMessage: postMessageSpy,
        close: vi.fn(),
        onmessage: null as unknown,
        onmessageerror: null as unknown,
      };

      constructor(_url: URL, _opts?: unknown) {}
    }

    vi.stubGlobal("SharedWorker", MockSharedWorker);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("envoie SUBSCRIBE avec orgId et token quand la session est disponible", async () => {
    const onMessage = vi.fn();
    renderHook(() => useRealtimeWorker({ orgId: "org-1", onMessage }));

    await waitFor(() => {
      expect(postMessageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "SUBSCRIBE",
          orgId: "org-1",
          token: "tok-1",
        }),
      );
    });
  });

  it("envoie UNSUBSCRIBE au démontage du dernier abonné", async () => {
    const onMessage = vi.fn();
    const { unmount } = renderHook(() => useRealtimeWorker({ orgId: "org-1", onMessage }));

    await waitFor(() => {
      expect(postMessageSpy).toHaveBeenCalled();
    });

    postMessageSpy.mockClear();
    unmount();

    await waitFor(() => {
      expect(postMessageSpy).toHaveBeenCalledWith({ type: "UNSUBSCRIBE" });
    });
    expect(mockAuthUnsubscribe).toHaveBeenCalled();
  });

  it("ne envoie pas UNSUBSCRIBE tant qu’un second hook est encore monté", async () => {
    const onMessage = vi.fn();
    const { unmount: u1 } = renderHook(() => useRealtimeWorker({ orgId: "org-1", onMessage }));
    const { unmount: u2 } = renderHook(() => useRealtimeWorker({ orgId: "org-1", onMessage }));

    await waitFor(() => {
      expect(postMessageSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    postMessageSpy.mockClear();
    u1();

    expect(postMessageSpy).not.toHaveBeenCalledWith({ type: "UNSUBSCRIBE" });

    postMessageSpy.mockClear();
    u2();

    expect(postMessageSpy).toHaveBeenCalledWith({ type: "UNSUBSCRIBE" });
  });
});
