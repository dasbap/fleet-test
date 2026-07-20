import type { FlushResult, QueueJob, QueuePolicy, QueueStats, QueueStorage } from "./types";

function nowIso(): string {
  return new Date().toISOString();
}

function nextRetry(attemptCount: number): string {
  const cappedAttempt = Math.min(Math.max(attemptCount, 1), 5);
  const baseDelaySec = 5 * 2 ** (cappedAttempt - 1);
  const jitterSec = Math.floor(Math.random() * 5);
  const totalSec = Math.min(baseDelaySec + jitterSec, 300);
  return new Date(Date.now() + totalSec * 1000).toISOString();
}

function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createQueueManager<TJob extends QueueJob>(
  storage: QueueStorage<TJob>,
  policy: QueuePolicy,
) {
  async function enqueue(
    input: Omit<
      TJob,
      "id" | "schemaVersion" | "idempotencyKey" | "status" | "attemptCount" | "nextRetryAt" | "lastError" | "createdAt" | "updatedAt"
    >,
  ): Promise<TJob> {
    const jobs = await storage.read();
    if (jobs.length >= policy.maxQueueSize) {
      throw new Error("La file hors ligne est pleine. Synchronisez avant de continuer.");
    }

    const ts = nowIso();
    const job: TJob = {
      ...input,
      id: createId(),
      schemaVersion: policy.schemaVersion,
      idempotencyKey: createId(),
      status: "pending",
      attemptCount: 0,
      nextRetryAt: ts,
      lastError: null,
      createdAt: ts,
      updatedAt: ts,
    } as TJob;

    await storage.write([...jobs, job]);
    return job;
  }

  async function getPendingJobs(now: Date = new Date()): Promise<TJob[]> {
    const jobs = await storage.read();
    return jobs
      .map((job) => ({
        ...job,
        status: job.status as TJob["status"],
      }))
      .filter((job) => {
        if (job.status === "succeeded") return false;
        if (job.nextRetryAt == null) return true;
        return new Date(job.nextRetryAt).getTime() <= now.getTime();
      });
  }

  async function markSyncing(jobId: string): Promise<TJob | null> {
    const jobs = await storage.read();
    let updated: TJob | null = null;
    const next = jobs.map((job) => {
      if (job.id !== jobId) return job;
      updated = { ...job, status: "syncing", updatedAt: nowIso() } as TJob;
      return updated;
    });
    if (updated) {
      await storage.write(next);
    }
    return updated;
  }

  async function markSucceeded(jobId: string): Promise<void> {
    const jobs = await storage.read();
    await storage.write(jobs.filter((job) => job.id !== jobId));
  }

  async function markFailed(jobId: string, errorMessage: string): Promise<void> {
    const jobs = await storage.read();
    const next = jobs.map((job) => {
      if (job.id !== jobId) return job;
      const attemptCount = job.attemptCount + 1;
      const reachedMax = attemptCount >= policy.maxAttempts;
      return {
        ...job,
        status: (reachedMax ? "failed" : "pending") as TJob["status"],
        attemptCount,
        nextRetryAt: reachedMax ? null : nextRetry(attemptCount),
        lastError: errorMessage,
        updatedAt: nowIso(),
      } as TJob;
    });
    await storage.write(next);
  }

  async function markConflict(jobId: string, errorMessage: string): Promise<void> {
    const jobs = await storage.read();
    const next = jobs.map((job) => {
      if (job.id !== jobId) return job;
      return {
        ...job,
        status: "conflict",
        lastError: errorMessage,
        updatedAt: nowIso(),
      } as TJob;
    });
    await storage.write(next);
  }

  /** Repasse en pending les jobs bloqués en syncing après crash. */
  async function recoverStuckSyncingJobs(stuckThresholdMs = 60_000): Promise<number> {
    const jobs = await storage.read();
    const now = Date.now();
    let recovered = 0;
    const next = jobs.map((job) => {
      if (job.status !== "syncing") return job;
      const age = now - new Date(job.updatedAt).getTime();
      if (age <= stuckThresholdMs) return job;
      recovered += 1;
      return {
        ...job,
        status: "pending",
        updatedAt: nowIso(),
      } as TJob;
    });
    if (recovered > 0) {
      await storage.write(next);
    }
    return recovered;
  }

  async function getQueueStats(): Promise<QueueStats> {
    const jobs = await storage.read();
    const now = Date.now();
    let oldestPendingAgeMs: number | null = null;

    for (const job of jobs) {
      if (job.status !== "pending" && job.status !== "failed" && job.status !== "conflict") continue;
      const age = now - new Date(job.createdAt).getTime();
      oldestPendingAgeMs = oldestPendingAgeMs == null ? age : Math.max(oldestPendingAgeMs, age);
    }

    return jobs.reduce<QueueStats>(
      (acc, job) => {
        if (job.status === "pending") acc.pending += 1;
        if (job.status === "syncing") acc.syncing += 1;
        if (job.status === "failed" || job.status === "conflict") acc.failed += 1;
        return acc;
      },
      { pending: 0, syncing: 0, failed: 0, oldestPendingAgeMs },
    );
  }

  async function flush(
    processJob: (job: TJob) => Promise<boolean>,
    options?: { shouldProcess?: (job: TJob) => boolean },
  ): Promise<FlushResult> {
    const pending = await getPendingJobs();
    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    for (const job of pending) {
      if (options?.shouldProcess && !options.shouldProcess(job)) continue;
      processed += 1;
      const ok = await processJob(job);
      if (ok) succeeded += 1;
      else failed += 1;
    }

    return { processed, succeeded, failed };
  }

  return {
    enqueue,
    getPendingJobs,
    markSyncing,
    markSucceeded,
    markFailed,
    markConflict,
    recoverStuckSyncingJobs,
    getQueueStats,
    flush,
  };
}
