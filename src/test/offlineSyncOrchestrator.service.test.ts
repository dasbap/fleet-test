import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  migrateLegacyIncidentDraftsToQueue,
  runOfflineSyncOnce,
} from "@/services/offlineSyncOrchestrator.service";
import * as cache from "@/lib/storage/flotteEsambaLocalCache";
import * as queueModule from "@/services/offlineQueue.service";
import { IncidentService } from "@/services/incident.service";
import { DriverShiftService } from "@/services/driver-shift.service";
import { FuelService } from "@/services/fuel.service";
import type { OfflineJob } from "@/types/offline-queue";

describe("offlineSyncOrchestrator", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(cache, "getIncidentDrafts").mockReturnValue([]);
    vi.spyOn(cache, "countPendingIncidentDrafts").mockReturnValue(0);
    vi.spyOn(cache, "patchLocalSyncState").mockImplementation(() => {});
    vi.spyOn(cache, "getLocalSyncMetrics").mockReturnValue({
      runs: 0,
      processedJobs: 0,
      succeededJobs: 0,
      failedJobs: 0,
      lastRunAt: null,
      lastDurationMs: null,
    });
    vi.spyOn(cache, "patchLocalSyncMetrics").mockImplementation(() => {});
  });

  it("migrateLegacyIncidentDraftsToQueue ne fait rien sans draft", async () => {
    const spyEnqueue = vi.spyOn(
      queueModule.OfflineQueueService.prototype,
      "enqueueIncidentCreate",
    );
    await migrateLegacyIncidentDraftsToQueue();
    expect(spyEnqueue).not.toHaveBeenCalled();
  });

  it("runOfflineSyncOnce retourne 0 si aucune tâche", async () => {
    vi.spyOn(queueModule.OfflineQueueService.prototype, "getPendingJobs").mockResolvedValue([]);
    const summary = await runOfflineSyncOnce();
    expect(summary.processed).toBe(0);
    expect(summary.succeeded).toBe(0);
    expect(summary.failed).toBe(0);
  });

  it("rejoue start/close/fuel hors ligne lors de la reconnexion", async () => {
    const jobs: OfflineJob[] = [
      {
        id: "job-shift-start",
        type: "shift:start",
        payload: { assignmentId: "assign-1", kmStart: 1000 },
        schemaVersion: 1,
        idempotencyKey: "idem-start",
        entityRef: "assign-1",
        status: "pending",
        attemptCount: 0,
        nextRetryAt: new Date(Date.now() - 1000).toISOString(),
        lastError: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "job-shift-close",
        type: "shift:close",
        payload: {
          shiftId: "shift-1",
          kmEnd: 1100,
          revenueDeclared: 10000,
          collectionMode: "cash",
          proofType: "momo_ref",
          proofValue: "REF-123",
        },
        schemaVersion: 1,
        idempotencyKey: "idem-close",
        entityRef: "shift-1",
        status: "pending",
        attemptCount: 0,
        nextRetryAt: new Date(Date.now() - 1000).toISOString(),
        lastError: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "job-fuel",
        type: "fuel:create",
        payload: {
          fleetId: "fleet-1",
          vehicleId: "veh-1",
          driverUserId: "user-1",
          liters: 20,
          amountXof: 15000,
          odometerKm: 1100,
          purchasedAt: new Date().toISOString(),
          stationName: "Station A",
          receiptRef: "RCPT-01",
        },
        schemaVersion: 1,
        idempotencyKey: "idem-fuel",
        entityRef: "veh-1",
        status: "pending",
        attemptCount: 0,
        nextRetryAt: new Date(Date.now() - 1000).toISOString(),
        lastError: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    vi.spyOn(queueModule.OfflineQueueService.prototype, "getPendingJobs").mockResolvedValue(jobs);
    vi.spyOn(queueModule.OfflineQueueService.prototype, "markSyncing").mockImplementation(
      async (jobId) => jobs.find((job) => job.id === jobId) ?? null,
    );
    const markSucceeded = vi
      .spyOn(queueModule.OfflineQueueService.prototype, "markSucceeded")
      .mockResolvedValue();
    vi.spyOn(queueModule.OfflineQueueService.prototype, "markFailed").mockResolvedValue();
    vi.spyOn(queueModule.OfflineQueueService.prototype, "getQueueStats").mockResolvedValue({
      pending: 0,
      syncing: 0,
      failed: 0,
      oldestPendingAgeMs: null,
    });

    const startShift = vi
      .spyOn(DriverShiftService.prototype, "startShift")
      .mockResolvedValue({} as never);
    const closeShift = vi
      .spyOn(DriverShiftService.prototype, "closeShift")
      .mockResolvedValue(undefined);
    const createFuel = vi
      .spyOn(FuelService.prototype, "createWithIdempotency")
      .mockResolvedValue(undefined);
    vi.spyOn(IncidentService.prototype, "declareIncidentWithOptionalEvidence").mockResolvedValue(
      {} as never,
    );

    const summary = await runOfflineSyncOnce();

    expect(summary).toEqual({ processed: 3, succeeded: 3, failed: 0 });
    expect(startShift).toHaveBeenCalledOnce();
    expect(closeShift).toHaveBeenCalledOnce();
    expect(createFuel).toHaveBeenCalledOnce();
    expect(markSucceeded).toHaveBeenCalledTimes(3);
    expect(cache.patchLocalSyncState).toHaveBeenCalledWith(
      expect.objectContaining({ displayStatus: "synced" }),
    );
  });
});

