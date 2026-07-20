import { getLocalSyncMetrics, patchLocalSyncMetrics } from "@/lib/storage/flotteEsambaLocalCache";

export interface OfflineSyncTelemetryEvent {
  processed: number;
  succeeded: number;
  failed: number;
  durationMs: number;
}

/** Enregistre les métriques de sync offline (monitoring local). */
export function recordOfflineSyncTelemetry(event: OfflineSyncTelemetryEvent): void {
  const successRate =
    event.processed > 0 ? Math.round((event.succeeded / event.processed) * 100) : 100;

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("esamba-offline-sync", {
        detail: { ...event, successRate },
      }),
    );
  }

  const previous = getLocalSyncMetrics();
  patchLocalSyncMetrics({
    runs: previous.runs + 1,
    processedJobs: previous.processedJobs + event.processed,
    succeededJobs: previous.succeededJobs + event.succeeded,
    failedJobs: previous.failedJobs + event.failed,
    lastRunAt: new Date().toISOString(),
    lastDurationMs: event.durationMs,
  });
}

export function getOfflineSyncSuccessRate(processed: number, succeeded: number): number {
  if (processed <= 0) return 100;
  return Math.round((succeeded / processed) * 100);
}
