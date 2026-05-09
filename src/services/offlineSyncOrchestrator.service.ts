import { countPendingIncidentDrafts, getIncidentDrafts } from "@/lib/storage/flotteEsambaLocalCache";
import { patchLocalSyncState } from "@/lib/storage/flotteEsambaLocalCache";
import { getLocalSyncMetrics, patchLocalSyncMetrics } from "@/lib/storage/flotteEsambaLocalCache";
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
} from "@/types/offline-queue";

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

    const endedAtIso = new Date().toISOString();
    const previous = getLocalSyncMetrics();
    patchLocalSyncMetrics({
      runs: previous.runs + 1,
      processedJobs: previous.processedJobs + processed,
      succeededJobs: previous.succeededJobs + succeeded,
      failedJobs: previous.failedJobs + failed,
      lastRunAt: endedAtIso,
      lastDurationMs: Date.now() - startedAt,
    });

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

    await offlineQueueService.markSucceeded(marked.id);
    return true;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur inconnue";
    await offlineQueueService.markFailed(marked.id, message);
    return false;
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
    });
    await offlineQueueService.markSucceeded(marked.id);
    return true;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur inconnue";
    await offlineQueueService.markFailed(marked.id, message);
    return false;
  }
}

async function processShiftCloseJob(job: OfflineJob): Promise<boolean> {
  const marked = await offlineQueueService.markSyncing(job.id);
  if (!marked || marked.type !== "shift:close") return false;
  try {
    const payload = marked.payload;
    await driverShiftService.closeShift({
      shift_id: payload.shiftId,
      km_end: payload.kmEnd,
      revenue_declared: payload.revenueDeclared,
      collection_mode: payload.collectionMode,
      proof_type: payload.proofType,
      proof_value: payload.proofValue,
    });
    await offlineQueueService.markSucceeded(marked.id);
    return true;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur inconnue";
    await offlineQueueService.markFailed(marked.id, message);
    return false;
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
    return true;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur inconnue";
    await offlineQueueService.markFailed(marked.id, message);
    return false;
  }
}

async function processDvirCreateJob(job: OfflineJob): Promise<boolean> {
  const marked = await offlineQueueService.markSyncing(job.id);
  if (!marked || marked.type !== "dvir:create") return false;
  try {
    const payload = marked.payload;
    await dvirService.create(
      {
        fleetId: payload.fleetId,
        vehicleId: payload.vehicleId,
        inspectedBy: payload.inspectedBy,
        inspectionType: payload.inspectionType,
        items: payload.items,
        notes: payload.notes ?? null,
        odometerKm: payload.odometerKm ?? null,
      },
      // Les photos base64 sont ignorées à la synchro — la saisie hors ligne
      // ne supporte pas l'upload de photos pour l'instant.
      [],
    );
    await offlineQueueService.markSucceeded(marked.id);
    return true;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur inconnue";
    await offlineQueueService.markFailed(marked.id, message);
    return false;
  }
}

const jobHandlers: Record<OfflineJobType, (job: OfflineJob) => Promise<boolean>> = {
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

