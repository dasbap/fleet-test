import * as offlineStorage from "@/lib/storage/offline-queue.storage";
import { appendActionJournalEntry } from "@/lib/offline/action-journal";
import { createQueueManager } from "../../packages/offline-core/src/queue-manager";
import {
  OFFLINE_QUEUE_MAX_ATTEMPTS,
  OFFLINE_QUEUE_MAX_SIZE,
  OFFLINE_QUEUE_SCHEMA_VERSION,
  SYNCING_STUCK_THRESHOLD_MS,
} from "@esamba/offline-contracts";
import type {
  OfflineDvirCreateJob,
  OfflineDvirCreatePayload,
  OfflineFuelCreateJob,
  OfflineFuelCreatePayload,
  OfflineIncidentCreateJob,
  OfflineIncidentCreatePayload,
  OfflineJob,
  OfflineJobType,
  OfflineShiftCloseJob,
  OfflineShiftClosePayload,
  OfflineShiftStartJob,
  OfflineShiftStartPayload,
} from "@/types/offline-queue";

function buildQueueManager() {
  return createQueueManager<OfflineJob>(
    {
      read: () => offlineStorage.readOfflineJobs(),
      write: (jobs) => offlineStorage.writeOfflineJobs(jobs),
    },
    {
      maxAttempts: OFFLINE_QUEUE_MAX_ATTEMPTS,
      maxQueueSize: OFFLINE_QUEUE_MAX_SIZE,
      schemaVersion: OFFLINE_QUEUE_SCHEMA_VERSION,
    },
  );
}

const JOB_SUMMARY: Record<OfflineJobType, string> = {
  "incident:create": "Incident signalé hors ligne",
  "shift:start": "Ouverture créneau hors ligne",
  "shift:close": "Clôture créneau hors ligne",
  "fuel:create": "Saisie carburant hors ligne",
  "dvir:create": "DVIR hors ligne",
  "maintenance:note": "Note maintenance hors ligne",
  "scan:log": "Scan QR hors ligne",
};

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
    appendActionJournalEntry({
      jobType: type,
      jobId: job.id,
      summary: JOB_SUMMARY[type],
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

  async markConflict(jobId: string, errorMessage: string): Promise<void> {
    await buildQueueManager().markConflict(jobId, errorMessage);
  }

  async recoverStuckJobs(): Promise<number> {
    return buildQueueManager().recoverStuckSyncingJobs(SYNCING_STUCK_THRESHOLD_MS);
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
