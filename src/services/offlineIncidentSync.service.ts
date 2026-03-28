import {
  countPendingIncidentDrafts,
  getIncidentDrafts,
  patchLocalSyncState,
  removeIncidentDraft,
  updateIncidentDraft,
} from "@/lib/storage/flotteEsambaLocalCache";
import { IncidentRepository } from "@/repositories/incident.repository";
import { IncidentEvidenceRepository } from "@/repositories/incident-evidence.repository";
import { IncidentService } from "@/services/incident.service";

const incidentRepository = new IncidentRepository();
const incidentEvidenceRepository = new IncidentEvidenceRepository();
const incidentService = new IncidentService(incidentRepository, incidentEvidenceRepository);

export interface SyncIncidentDraftsResult {
  synced: number;
  failed: number;
}

/**
 * Envoie les brouillons d’incidents vers l’API lorsque le réseau est disponible.
 * Ne lance pas Supabase depuis les composants : orchestration côté service.
 */
export async function syncPendingIncidentDrafts(): Promise<SyncIncidentDraftsResult> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { synced: 0, failed: 0 };
  }

  const drafts = getIncidentDrafts().filter(
    (d) => d.status === "pending" || d.status === "failed",
  );
  if (drafts.length === 0) {
    return { synced: 0, failed: 0 };
  }

  patchLocalSyncState({ displayStatus: "syncing", lastSyncError: null });

  let synced = 0;
  let failed = 0;

  for (const draft of drafts) {
    updateIncidentDraft(draft.id, { status: "syncing" });
    try {
      await incidentService.declareIncidentWithOptionalEvidence({
        fleetId: draft.fleetId,
        incident: {
          vehicle_id: draft.vehicleId,
          driver_user_id: draft.driverUserId,
          description: draft.description,
          severity: draft.severity,
          incident_category: draft.incidentCategory ?? null,
          latitude: draft.latitude ?? null,
          longitude: draft.longitude ?? null,
        },
        evidenceDataUrl: draft.evidenceDataUrl ?? null,
      });
      removeIncidentDraft(draft.id);
      synced++;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erreur inconnue";
      updateIncidentDraft(draft.id, { status: "failed", lastError: message });
      failed++;
    }
  }

  const now = new Date().toISOString();
  const stillPending = countPendingIncidentDrafts();

  if (failed > 0) {
    patchLocalSyncState({
      displayStatus: "error",
      lastSyncError: "Certains brouillons n’ont pas pu être envoyés.",
    });
  } else if (synced > 0 && stillPending === 0) {
    patchLocalSyncState({
      displayStatus: "synced",
      lastSuccessfulSyncAt: now,
      lastSyncError: null,
    });
  } else if (stillPending === 0) {
    patchLocalSyncState({ displayStatus: "synced", lastSyncError: null });
  }

  return { synced, failed };
}
