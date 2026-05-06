import * as offlineStorage from "@/lib/storage/offline-queue.storage";
import { createQueueManager } from "../../packages/offline-core/src/queue-manager";
import type {
  OfflineDvirCreateJob,
  OfflineDvirCreatePayload,
  OfflineFuelCreateJob,
  OfflineFuelCreatePayload,
  OfflineIncidentCreateJob,
  OfflineIncidentCreatePayload,
  OfflineJob,
  OfflineJobStatus,
  OfflineJobType,
  OfflineShiftCloseJob,
  OfflineShiftClosePayload,
  OfflineShiftStartJob,
  OfflineShiftStartPayload,
} from "@/types/offline-queue";

const MAX_ATTEMPTS = 5;
const MAX_QUEUE_SIZE = 200;
const OFFLINE_QUEUE_SCHEMA_VERSION = 1;

function buildQueueManager() {
  return createQueueManager<OfflineJob>(
    {
      read: () => offlineStorage.readOfflineJobs(),
      write: (jobs) => offlineStorage.writeOfflineJobs(jobs),
    },
    {
      maxAttempts: MAX_ATTEMPTS,
      maxQueueSize: MAX_QUEUE_SIZE,
      schemaVersion: OFFLINE_QUEUE_SCHEMA_VERSION,
    },
  );
}

export class OfflineQueueService {
  private async enqueueJob<TType extends OfflineJobType, TPayload>(
    type: TType,
    payload: TPayload,
    entityRef: string | null,
  ): Promise<OfflineJob> {
    const job = await buildQueueManager().enqueue({
      type,
      payload,
      entityRef,
    });
    return job;
  }

  async enqueueIncidentCreate(payload: OfflineIncidentCreatePayload): Promise<OfflineIncidentCreateJob> {
    const job = await this.enqueueJob("incident:create", payload, payload.draftId ?? null);
    return job as OfflineIncidentCreateJob;
  }

  async enqueueShiftStart(payload: OfflineShiftStartPayload): Promise<OfflineShiftStartJob> {
    const job = await this.enqueueJob("shift:start", payload, payload.assignmentId);
    return job as OfflineShiftStartJob;
  }

  async enqueueShiftClose(payload: OfflineShiftClosePayload): Promise<OfflineShiftCloseJob> {
    const job = await this.enqueueJob("shift:close", payload, payload.shiftId);
    return job as OfflineShiftCloseJob;
  }

  async enqueueFuelCreate(payload: OfflineFuelCreatePayload): Promise<OfflineFuelCreateJob> {
    const job = await this.enqueueJob("fuel:create", payload, payload.vehicleId);
    return job as OfflineFuelCreateJob;
  }

  async enqueueDvirCreate(payload: OfflineDvirCreatePayload): Promise<OfflineDvirCreateJob> {
    const job = await this.enqueueJob("dvir:create", payload, payload.vehicleId);
    return job as OfflineDvirCreateJob;
  }

  async getPendingJobs(now: Date = new Date()): Promise<OfflineJob[]> {
    return buildQueueManager().getPendingJobs(now);
  }

  async markSyncing(jobId: string): Promise<OfflineJob | null> {
    return buildQueueManager().markSyncing(jobId);
  }

  async markSucceeded(jobId: string): Promise<void> {
    await buildQueueManager().markSucceeded(jobId);
  }

  async markFailed(jobId: string, errorMessage: string): Promise<void> {
    await buildQueueManager().markFailed(jobId, errorMessage);
  }

  async getQueueStats(): Promise<{
    pending: number;
    syncing: number;
    failed: number;
    oldestPendingAgeMs: number | null;
  }> {
    return buildQueueManager().getQueueStats();
  }
}

