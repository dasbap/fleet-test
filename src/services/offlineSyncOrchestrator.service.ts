import { countPendingIncidentDrafts, getIncidentDrafts } from "@/lib/storage/flotteEsambaLocalCache";
import { patchLocalSyncState } from "@/lib/storage/flotteEsambaLocalCache";
import { OfflineQueueService } from "@/services/offlineQueue.service";
import { IncidentRepository } from "@/repositories/incident.repository";
import { IncidentEvidenceRepository } from "@/repositories/incident-evidence.repository";
import { IncidentService } from "@/services/incident.service";
import type { OfflineIncidentCreateJob, OfflineIncidentCreatePayload } from "@/types/offline-queue";

const offlineQueueService = new OfflineQueueService();
const incidentRepository = new IncidentRepository();
const incidentEvidenceRepository = new IncidentEvidenceRepository();
const incidentService = new IncidentService(incidentRepository, incidentEvidenceRepository);

let syncLock = false;

export interface SyncResultSummary {
  processed: number;
  succeeded: number;
  failed: number;
}

export async function runOfflineSyncOnce(): Promise<SyncResultSummary> {
  if (syncLock) {
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  syncLock = true;
  try {
    const pendingJobs = offlineQueueService.getPendingJobs();
    if (pendingJobs.length === 0) {
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    patchLocalSyncState({ displayStatus: "syncing", lastSyncError: null });

    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    for (const job of pendingJobs) {
      if (job.type !== "incident:create") {
        continue;
      }
      const synced = await processIncidentCreateJob(job);
      processed += 1;
      if (synced) {
        succeeded += 1;
      } else {
        failed += 1;
      }
    }

    const now = new Date().toISOString();
    const stillPending = countPendingIncidentDrafts();

    if (failed > 0) {
      patchLocalSyncState({
        displayStatus: "error",
        lastSyncError: "Certains signalements n’ont pas pu être envoyés.",
      });
    } else if (succeeded > 0 && stillPending === 0) {
      patchLocalSyncState({
        displayStatus: "synced",
        lastSuccessfulSyncAt: now,
        lastSyncError: null,
      });
    } else if (stillPending === 0) {
      patchLocalSyncState({ displayStatus: "synced", lastSyncError: null });
    }

    return { processed, succeeded, failed };
  } finally {
    syncLock = false;
  }
}

async function processIncidentCreateJob(job: OfflineIncidentCreateJob): Promise<boolean> {
  const marked = offlineQueueService.markSyncing(job.id);
  if (!marked) {
    return false;
  }

  try {
    const payload: OfflineIncidentCreatePayload = marked.payload;
    await incidentService.declareIncidentWithOptionalEvidence({
      fleetId: payload.fleetId,
      incident: {
        vehicle_id: payload.vehicleId,
        driver_user_id: payload.driverUserId,
        description: payload.description,
        severity: payload.severity,
        incident_category: payload.incidentCategory ?? null,
        latitude: payload.latitude ?? null,
        longitude: payload.longitude ?? null,
      },
      evidenceDataUrl: payload.evidenceDataUrl ?? null,
    });

    offlineQueueService.markSucceeded(marked.id);
    return true;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur inconnue";
    offlineQueueService.markFailed(marked.id, message);
    return false;
  }
}

export function migrateLegacyIncidentDraftsToQueue(): void {
  const drafts = getIncidentDrafts();
  if (!drafts.length) return;

  for (const draft of drafts) {
    offlineQueueService.enqueueIncidentCreate({
      draftId: draft.id,
      fleetId: draft.fleetId,
      vehicleId: draft.vehicleId,
      driverUserId: draft.driverUserId,
      description: draft.description,
      severity: draft.severity,
      incidentCategory: draft.incidentCategory ?? null,
      latitude: draft.latitude ?? null,
      longitude: draft.longitude ?? null,
      evidenceDataUrl: draft.evidenceDataUrl ?? null,
    });
  }
}

