import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { syncQueue } from "@/services/syncQueue.service";
import { OfflinePendingSyncBridge } from "./OfflinePendingSyncBridge";

const toastMock = vi.fn();

vi.mock("@/hooks/use-toast", () => ({
  toast: (...args: unknown[]) => toastMock(...args),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      id: "user-offline-test",
      email: "offline-test@example.com",
      user_metadata: {},
      created_at: "2020-01-01T00:00:00.000Z",
    },
    userFleetId: "fleet-1",
    orgId: "org-1",
    isLoading: false,
  }),
}));

function setNavigatorOnLine(value: boolean) {
  Object.defineProperty(navigator, "onLine", {
    configurable: true,
    value,
    writable: true,
  });
}

describe("OfflinePendingSyncBridge (scénario hors ligne / reconnexion)", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    toastMock.mockClear();
    setNavigatorOnLine(true);
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.spyOn(queryClient, "invalidateQueries");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    setNavigatorOnLine(true);
  });

  function renderBridge() {
    return render(
      <QueryClientProvider client={queryClient}>
        <OfflinePendingSyncBridge />
      </QueryClientProvider>,
    );
  }

  it("après offline puis online, exécute la synchro et affiche le toast de succès (file simulée)", async () => {
    let syncCalls = 0;
    vi.spyOn(syncQueue, "runPendingOfflineSync").mockImplementation(async () => {
      syncCalls += 1;
      if (syncCalls === 1) {
        return { processed: 0, succeeded: 0, failed: 0 };
      }
      if (syncCalls === 2) {
        return { processed: 1, succeeded: 1, failed: 0 };
      }
      return { processed: 0, succeeded: 0, failed: 0 };
    });

    renderBridge();

    await waitFor(() => {
      expect(syncCalls).toBeGreaterThanOrEqual(1);
    });

    await act(async () => {
      setNavigatorOnLine(false);
      window.dispatchEvent(new Event("offline"));
    });

    await act(async () => {
      setNavigatorOnLine(true);
      window.dispatchEvent(new Event("online"));
    });

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Synchronisation",
          description: "Une saisie hors ligne a été envoyée.",
        }),
      );
    });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["incidents"] });
  });

  it("l’événement window online déclenche une synchro lorsque l’utilisateur est connecté", async () => {
    let syncCalls = 0;
    vi.spyOn(syncQueue, "runPendingOfflineSync").mockImplementation(async () => {
      syncCalls += 1;
      if (syncCalls === 1) return { processed: 0, succeeded: 0, failed: 0 };
      if (syncCalls === 2) return { processed: 1, succeeded: 1, failed: 0 };
      return { processed: 0, succeeded: 0, failed: 0 };
    });

    renderBridge();

    await waitFor(() => expect(syncCalls).toBeGreaterThanOrEqual(1));

    await act(async () => {
      setNavigatorOnLine(true);
      window.dispatchEvent(new Event("online"));
    });

    await waitFor(() => {
      expect(syncCalls).toBeGreaterThanOrEqual(2);
    });
  });
});
