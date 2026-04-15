import { readOfflineJobs, writeOfflineJobs } from "@/lib/storage/offline-queue.storage";
import type {
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

function nowIso(): string {
  return new Date().toISOString();
}

function computeNextRetry(attemptCount: number): string | null {
  if (attemptCount <= 0) return nowIso();
  const cappedAttempt = Math.min(attemptCount, 5);
  const baseDelaySec = 5 * 2 ** (cappedAttempt - 1);
  const jitterSec = Math.floor(Math.random() * 5);
  const totalSec = Math.min(baseDelaySec + jitterSec, 5 * 60);
  const next = new Date(Date.now() + totalSec * 1000);
  return next.toISOString();
}

export class OfflineQueueService {
  private async enqueueJob<TType extends OfflineJobType, TPayload>(
    type: TType,
    payload: TPayload,
    entityRef: string | null,
  ): Promise<OfflineJob> {
    const jobs = await readOfflineJobs();
    if (jobs.length >= MAX_QUEUE_SIZE) {
      throw new Error("La file hors ligne est pleine. Synchronisez avant de continuer.");
    }
    const job: OfflineJob = {
      id: crypto.randomUUID(),
      type,
      payload,
      schemaVersion: OFFLINE_QUEUE_SCHEMA_VERSION,
      idempotencyKey: crypto.randomUUID(),
      entityRef,
      status: "pending",
      attemptCount: 0,
      nextRetryAt: computeNextRetry(0),
      lastError: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    jobs.push(job);
    await writeOfflineJobs(jobs);
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

  async getPendingJobs(now: Date = new Date()): Promise<OfflineJob[]> {
    const jobs = await readOfflineJobs();
    return jobs.filter((job) => {
      if (job.status === "succeeded") return false;
      if (job.nextRetryAt == null) return true;
      return new Date(job.nextRetryAt) <= now;
    });
  }

  async markSyncing(jobId: string): Promise<OfflineJob | null> {
    const jobs = await readOfflineJobs();
    let updated: OfflineJob | null = null;
    const next = jobs.map((job) => {
      if (job.id !== jobId) return job;
      updated = {
        ...job,
        status: "syncing",
        updatedAt: nowIso(),
      };
      return updated;
    });
    if (updated) {
      await writeOfflineJobs(next);
    }
    return updated;
  }

  async markSucceeded(jobId: string): Promise<void> {
    const jobs = (await readOfflineJobs()).filter((job) => job.id !== jobId);
    await writeOfflineJobs(jobs);
  }

  async markFailed(jobId: string, errorMessage: string): Promise<void> {
    const jobs = await readOfflineJobs();
    const now = new Date();
    const next = jobs.map((job) => {
      if (job.id !== jobId) return job;
      const newAttempt = job.attemptCount + 1;
      const reachedMax = newAttempt >= MAX_ATTEMPTS;
      return {
        ...job,
        status: reachedMax ? "failed" : "pending",
        attemptCount: newAttempt,
        nextRetryAt: reachedMax ? null : computeNextRetry(newAttempt),
        lastError: errorMessage,
        updatedAt: now.toISOString(),
      };
    });
    await writeOfflineJobs(next);
  }

  async getQueueStats(): Promise<{
    pending: number;
    syncing: number;
    failed: number;
    oldestPendingAgeMs: number | null;
  }> {
    const jobs = await readOfflineJobs();
    const now = Date.now();
    let oldestPendingAgeMs: number | null = null;

    for (const job of jobs) {
      if (job.status !== "pending" && job.status !== "failed") continue;
      const age = now - new Date(job.createdAt).getTime();
      oldestPendingAgeMs =
        oldestPendingAgeMs == null ? age : Math.max(oldestPendingAgeMs, age);
    }

    return jobs.reduce(
      (acc, job) => {
        if (job.status === "pending") acc.pending += 1;
        if (job.status === "syncing") acc.syncing += 1;
        if (job.status === "failed") acc.failed += 1;
        return acc;
      },
      { pending: 0, syncing: 0, failed: 0, oldestPendingAgeMs }
    );
  }
}

