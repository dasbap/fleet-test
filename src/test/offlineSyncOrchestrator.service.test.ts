import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  migrateLegacyIncidentDraftsToQueue,
  runOfflineSyncOnce,
} from "@/services/offlineSyncOrchestrator.service";
import * as cache from "@/lib/storage/flotteEsambaLocalCache";
import * as queueModule from "@/services/offlineQueue.service";

describe("offlineSyncOrchestrator", () => {
  beforeEach(() => {
    vi.spyOn(cache, "getIncidentDrafts").mockReturnValue([]);
    vi.spyOn(cache, "countPendingIncidentDrafts").mockReturnValue(0);
    vi.spyOn(cache, "patchLocalSyncState").mockImplementation(() => {});
  });

  it("migrateLegacyIncidentDraftsToQueue ne fait rien sans draft", () => {
    const spyEnqueue = vi.spyOn(
      queueModule.OfflineQueueService.prototype,
      "enqueueIncidentCreate",
    );
    migrateLegacyIncidentDraftsToQueue();
    expect(spyEnqueue).not.toHaveBeenCalled();
  });

  it("runOfflineSyncOnce retourne 0 si aucune tâche", async () => {
    const summary = await runOfflineSyncOnce();
    expect(summary.processed).toBe(0);
    expect(summary.succeeded).toBe(0);
    expect(summary.failed).toBe(0);
  });
});

