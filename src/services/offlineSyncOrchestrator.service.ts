import { classifySyncError } from "@esamba/domain-sync";
import { countPendingIncidentDrafts, getIncidentDrafts } from "@/lib/storage/flotteEsambaLocalCache";
import { patchLocalSyncState } from "@/lib/storage/flotteEsambaLocalCache";
import { updateActionJournalStatus } from "@/lib/offline/action-journal";
import {
  resolveDvirPhotoDataUrls,
  resolveEvidenceDataUrl,
  resolveProofValue,
} from "@/lib/offline/prepare-offline-media";
import { recordOfflineSyncTelemetry } from "@/lib/offline/offline-telemetry";
import { deletePendingOfflineMedia } from "@/services/offline-media-storage.service";
import { OfflineQueueService } from "@/services/offlineQueue.service";
import { IncidentRepository } from "@/repositories/incident.repository";
import { IncidentEvidenceRepository } from "@/repositories/incident-evidence.repository";
import { IncidentService } from "@/services/incident.service";
import { DriverShiftRepository } from "@/repositories/driver-shift.repository";
import { VehicleRepository } from "@/repositories/vehicle.repository";
import { DriverShiftService } from "@/services/driver-shift.service";
import { FuelRepository } from "@/repositories/fuel.repository";
import { FuelService } from "@/services/fuel.service";
import { DvirRepository } from "@/repositories/dvir.repository";
import { DvirService } from "@/services/dvir.service";
import type {
  OfflineIncidentCreateJob,
  OfflineIncidentCreatePayload,
  OfflineJob,
  OfflineJobType,
  OfflineMediaRef,
} from "@/types/offline-queue";

async function dataUrlToFile(dataUrl: string, fileName: string): Promise<File> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], fileName, { type: blob.type || "image/jpeg" });
}

async function cleanupMediaRefs(refs: Array<OfflineMediaRef | null | undefined>): Promise<void> {
  for (const ref of refs) {
    if (!ref) continue;
    try {
      await deletePendingOfflineMedia(ref);
    } catch {
      // Nettoyage best-effort
    }
  }
}

async function handleJobError(
  job: OfflineJob,
  error: unknown,
): Promise<boolean> {
  const message = error instanceof Error ? error.message : "Erreur inconnue";
  const classification = classifySyncError(job.type, message);

  if (classification.isConflict) {
    await offlineQueueService.markConflict(job.id, classification.userMessage);
    updateActionJournalStatus(job.id, "conflict", classification.userMessage);
    return false;
  }

  if (!classification.isRetryable) {
    await offlineQueueService.markSucceeded(job.id);
    updateActionJournalStatus(job.id, "synced");
    return true;
  }

  await offlineQueueService.markFailed(job.id, classification.userMessage);
  updateActionJournalStatus(job.id, "failed", classification.userMessage);
  return false;
}

const offlineQueueService = new OfflineQueueService();
const incidentRepository = new IncidentRepository();
const incidentEvidenceRepository = new IncidentEvidenceRepository();
const incidentService = new IncidentService(incidentRepository, incidentEvidenceRepository);
const driverShiftRepository = new DriverShiftRepository();
const vehicleRepository = new VehicleRepository();
const driverShiftService = new DriverShiftService(driverShiftRepository, vehicleRepository);
const fuelRepository = new FuelRepository();
const fuelService = new FuelService(fuelRepository);
const dvirRepository = new DvirRepository();
const dvirService = new DvirService(dvirRepository);

let syncLock = false;

export interface SyncResultSummary {
  processed: number;
  succeeded: number;
  failed: number;
}

export async function runOfflineSyncOnce(): Promise<SyncResultSummary> {
  const startedAt = Date.now();
  if (syncLock) {
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  syncLock = true;
  try {
    const pendingJobs = await offlineQueueService.getPendingJobs();
    if (pendingJobs.length === 0) {
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    patchLocalSyncState({ displayStatus: "syncing", lastSyncError: null });

    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    for (const job of pendingJobs) {
      const synced = await processJob(job);
      processed += 1;
      if (synced) {
        succeeded += 1;
      } else {
        failed += 1;
      }
    }

    const now = new Date().toISOString();
    const stillPending = countPendingIncidentDrafts();

    const queueStats = await offlineQueueService.getQueueStats();

    if (failed > 0 || queueStats.failed > 0) {
      patchLocalSyncState({
        displayStatus: "error",
        lastSyncError: "Certaines saisies hors ligne n’ont pas pu être synchronisées.",
      });
    } else if (queueStats.pending > 0 || stillPending > 0) {
      patchLocalSyncState({
        displayStatus: "pending",
        lastSyncError: null,
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

    recordOfflineSyncTelemetry({ processed, succeeded, failed, durationMs: Date.now() - startedAt });

    return { processed, succeeded, failed };
  } finally {
    syncLock = false;
  }
}

async function processIncidentCreateJob(job: OfflineIncidentCreateJob): Promise<boolean> {
  const marked = await offlineQueueService.markSyncing(job.id);
  if (!marked) {
    return false;
  }

  try {
    const payload: OfflineIncidentCreatePayload = marked.payload;
    const evidenceDataUrl = await resolveEvidenceDataUrl(payload);
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
        client_idempotency_key: marked.idempotencyKey,
      },
      evidenceDataUrl,
    });

    await offlineQueueService.markSucceeded(marked.id);
    updateActionJournalStatus(marked.id, "synced");
    await cleanupMediaRefs([payload.evidenceMediaRef]);
    return true;
  } catch (e) {
    return handleJobError(marked, e);
  }
}

async function processShiftStartJob(job: OfflineJob): Promise<boolean> {
  const marked = await offlineQueueService.markSyncing(job.id);
  if (!marked || marked.type !== "shift:start") return false;
  try {
    const payload = marked.payload;
    await driverShiftService.startShift({
      assignment_id: payload.assignmentId,
      km_start: payload.kmStart,
      client_idempotency_key: marked.idempotencyKey,
    });
    await offlineQueueService.markSucceeded(marked.id);
    updateActionJournalStatus(marked.id, "synced");
    return true;
  } catch (e) {
    return handleJobError(marked, e);
  }
}

async function processShiftCloseJob(job: OfflineJob): Promise<boolean> {
  const marked = await offlineQueueService.markSyncing(job.id);
  if (!marked || marked.type !== "shift:close") return false;
  try {
    const payload = marked.payload;
    const proofValue = await resolveProofValue(payload);
    await driverShiftService.closeShift({
      shift_id: payload.shiftId,
      km_end: payload.kmEnd,
      revenue_declared: payload.revenueDeclared,
      collection_mode: payload.collectionMode,
      proof_type: payload.proofType,
      proof_value: proofValue,
      client_idempotency_key: marked.idempotencyKey,
    });
    await offlineQueueService.markSucceeded(marked.id);
    updateActionJournalStatus(marked.id, "synced");
    await cleanupMediaRefs([payload.proofMediaRef]);
    return true;
  } catch (e) {
    return handleJobError(marked, e);
  }
}

async function processFuelCreateJob(job: OfflineJob): Promise<boolean> {
  const marked = await offlineQueueService.markSyncing(job.id);
  if (!marked || marked.type !== "fuel:create") return false;
  try {
    const payload = marked.payload;
    await fuelService.createWithIdempotency(
      {
        fleetId: payload.fleetId,
        vehicleId: payload.vehicleId,
        driverUserId: payload.driverUserId,
        liters: payload.liters,
        amountXof: payload.amountXof,
        odometerKm: payload.odometerKm,
        purchasedAt: payload.purchasedAt,
        stationName: payload.stationName,
        receiptRef: payload.receiptRef,
      },
      marked.idempotencyKey,
    );
    await offlineQueueService.markSucceeded(marked.id);
    updateActionJournalStatus(marked.id, "synced");
    return true;
  } catch (e) {
    return handleJobError(marked, e);
  }
}

async function processDvirCreateJob(job: OfflineJob): Promise<boolean> {
  const marked = await offlineQueueService.markSyncing(job.id);
  if (!marked || marked.type !== "dvir:create") return false;
  try {
    const payload = marked.payload;
    const photoDataUrls = await resolveDvirPhotoDataUrls(payload);
    const photoUrls: string[] = [];
    for (let i = 0; i < photoDataUrls.length; i++) {
      try {
        const file = await dataUrlToFile(photoDataUrls[i], `dvir-offline-${i}.jpg`);
        const url = await dvirService.uploadPhoto(payload.fleetId, payload.vehicleId, file);
        photoUrls.push(url);
      } catch {
        // Photo non bloquante
      }
    }

    await dvirService.create(
      {
        fleetId: payload.fleetId,
        vehicleId: payload.vehicleId,
        inspectedBy: payload.inspectedBy,
        inspectionType: payload.inspectionType,
        items: payload.items,
        notes: payload.notes ?? null,
        odometerKm: payload.odometerKm ?? null,
        clientIdempotencyKey: marked.idempotencyKey,
      },
      photoUrls,
    );
    await offlineQueueService.markSucceeded(marked.id);
    updateActionJournalStatus(marked.id, "synced");
    await cleanupMediaRefs(payload.photoMediaRefs ?? []);
    return true;
  } catch (e) {
    return handleJobError(marked, e);
  }
}

const jobHandlers: Partial<Record<OfflineJobType, (job: OfflineJob) => Promise<boolean>>> = {
  "incident:create": (job) => processIncidentCreateJob(job as OfflineIncidentCreateJob),
  "shift:start": processShiftStartJob,
  "shift:close": processShiftCloseJob,
  "fuel:create": processFuelCreateJob,
  "dvir:create": processDvirCreateJob,
};

async function processJob(job: OfflineJob): Promise<boolean> {
  const handler = jobHandlers[job.type];
  if (!handler) {
    await offlineQueueService.markFailed(job.id, `Type de job non supporté: ${job.type}`);
    return false;
  }
  return handler(job);
}

export async function migrateLegacyIncidentDraftsToQueue(): Promise<void> {
  const drafts = getIncidentDrafts();
  if (!drafts.length) return;

  for (const draft of drafts) {
    await offlineQueueService.enqueueIncidentCreate({
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

