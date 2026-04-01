import { readOfflineJobs, writeOfflineJobs } from "@/lib/storage/offline-queue.storage";
import type {
  OfflineIncidentCreateJob,
  OfflineIncidentCreatePayload,
  OfflineJob,
  OfflineJobStatus,
} from "@/types/offline-queue";

const MAX_ATTEMPTS = 5;

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

function updateJobStatus(
  job: OfflineJob,
  status: OfflineJobStatus,
  lastError: string | null,
): OfflineJob {
  const attemptCount =
    status === "pending" || status === "syncing" ? job.attemptCount : job.attemptCount;

  return {
    ...job,
    status,
    attemptCount,
    lastError,
    updatedAt: nowIso(),
  };
}

export class OfflineQueueService {
  enqueueIncidentCreate(payload: OfflineIncidentCreatePayload): OfflineIncidentCreateJob {
    const jobs = readOfflineJobs();
    const job: OfflineIncidentCreateJob = {
      id: crypto.randomUUID(),
      type: "incident:create",
      payload,
      status: "pending",
      attemptCount: 0,
      nextRetryAt: computeNextRetry(0),
      lastError: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    jobs.push(job);
    writeOfflineJobs(jobs);
    return job;
  }

  getPendingJobs(now: Date = new Date()): OfflineJob[] {
    const jobs = readOfflineJobs();
    return jobs.filter((job) => {
      if (job.status === "succeeded") return false;
      if (job.nextRetryAt == null) return true;
      return new Date(job.nextRetryAt) <= now;
    });
  }

  markSyncing(jobId: string): OfflineJob | null {
    const jobs = readOfflineJobs();
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
      writeOfflineJobs(next);
    }
    return updated;
  }

  markSucceeded(jobId: string): void {
    const jobs = readOfflineJobs().filter((job) => job.id !== jobId);
    writeOfflineJobs(jobs);
  }

  markFailed(jobId: string, errorMessage: string): void {
    const jobs = readOfflineJobs();
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
    writeOfflineJobs(next);
  }
}

