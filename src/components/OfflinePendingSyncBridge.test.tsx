import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { OfflinePendingSyncBridge } from "./OfflinePendingSyncBridge";

const orchestratorMocks = vi.hoisted(() => ({
  migrateLegacyIncidentDraftsToQueue: vi.fn().mockResolvedValue(undefined),
  runOfflineSyncOnce: vi.fn().mockResolvedValue({ processed: 0, succeeded: 0, failed: 0 }),
}));

vi.mock("@/services/offlineSyncOrchestrator.service", () => ({
  migrateLegacyIncidentDraftsToQueue: orchestratorMocks.migrateLegacyIncidentDraftsToQueue,
  runOfflineSyncOnce: orchestratorMocks.runOfflineSyncOnce,
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
    orchestratorMocks.migrateLegacyIncidentDraftsToQueue.mockClear();
    orchestratorMocks.runOfflineSyncOnce.mockClear();
    orchestratorMocks.runOfflineSyncOnce.mockResolvedValue({ processed: 0, succeeded: 0, failed: 0 });
    setNavigatorOnLine(true);
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
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

  it("au montage en ligne, migre les brouillons legacy puis tente une synchro", async () => {
    renderBridge();

    await waitFor(() => {
      expect(orchestratorMocks.migrateLegacyIncidentDraftsToQueue).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(orchestratorMocks.runOfflineSyncOnce).toHaveBeenCalled();
    });
  });

  it("après passage hors ligne puis en ligne, déclenche au moins une synchro supplémentaire", async () => {
    renderBridge();

    await waitFor(() => expect(orchestratorMocks.runOfflineSyncOnce).toHaveBeenCalled());

    const callsAfterMount = orchestratorMocks.runOfflineSyncOnce.mock.calls.length;

    await act(async () => {
      setNavigatorOnLine(false);
      window.dispatchEvent(new Event("offline"));
    });

    await act(async () => {
      setNavigatorOnLine(true);
      window.dispatchEvent(new Event("online"));
    });

    await waitFor(() => {
      expect(orchestratorMocks.runOfflineSyncOnce.mock.calls.length).toBeGreaterThan(callsAfterMount);
    });
  });
});
