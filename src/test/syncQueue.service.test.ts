import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import * as orchestrator from "@/services/offlineSyncOrchestrator.service";
import * as cache from "@/lib/storage/flotteEsambaLocalCache";
import {
  runPendingOfflineSync,
  setupNetworkListener,
} from "@/services/syncQueue.service";

describe("syncQueue.service", () => {
  beforeEach(() => {
    vi.spyOn(cache, "countPendingIncidentDrafts").mockReturnValue(0);
    vi.spyOn(orchestrator, "migrateLegacyIncidentDraftsToQueue").mockResolvedValue();
    vi.spyOn(orchestrator, "runOfflineSyncOnce").mockResolvedValue({
      processed: 0,
      succeeded: 0,
      failed: 0,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("runPendingOfflineSync n’appelle pas la migration sans brouillon en attente", async () => {
    vi.spyOn(cache, "countPendingIncidentDrafts").mockReturnValue(0);
    await runPendingOfflineSync();
    expect(orchestrator.migrateLegacyIncidentDraftsToQueue).not.toHaveBeenCalled();
    expect(orchestrator.runOfflineSyncOnce).toHaveBeenCalledOnce();
  });

  it("runPendingOfflineSync appelle migrateLegacyIncidentDraftsToQueue lorsque count > 0", async () => {
    vi.spyOn(cache, "countPendingIncidentDrafts").mockReturnValue(2);
    await runPendingOfflineSync();
    expect(orchestrator.migrateLegacyIncidentDraftsToQueue).toHaveBeenCalledOnce();
    expect(orchestrator.runOfflineSyncOnce).toHaveBeenCalledOnce();
  });

  it("setupNetworkListener retire l’écouteur précédent avant d’en enregistrer un nouveau", () => {
    const remove = vi.spyOn(window, "removeEventListener");
    const a = vi.fn();
    const b = vi.fn();
    setupNetworkListener(a);
    setupNetworkListener(b);
    expect(remove).toHaveBeenCalledWith("online", expect.any(Function));
  });
});
