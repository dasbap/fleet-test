export type OfflineJobStatus =
  | "pending"
  | "syncing"
  | "succeeded"
  | "failed"
  | "conflict";

export type OfflineJobType =
  | "incident:create"
  | "shift:start"
  | "shift:close"
  | "fuel:create"
  | "dvir:create"
  | "maintenance:note"
  | "scan:log";

export type CollectionMode = "cash" | "momo" | "mix";

export interface OfflineJobBase<
  TType extends OfflineJobType = OfflineJobType,
  TPayload = unknown,
> {
  id: string;
  type: TType;
  payload: TPayload;
  schemaVersion: number;
  idempotencyKey: string;
  entityRef: string | null;
  status: OfflineJobStatus;
  attemptCount: number;
  nextRetryAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Référence média locale (Filesystem ou blob web) — évite base64 en queue. */
export interface OfflineMediaRef {
  ref: string;
  mimeType: string;
  sizeBytes: number;
}

export interface OfflineIncidentCreatePayload {
  draftId?: string;
  fleetId: string;
  vehicleId: string;
  driverUserId: string;
  description: string;
  severity: string;
  incidentCategory?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  /** @deprecated Préférer evidenceMediaRef */
  evidenceDataUrl?: string | null;
  evidenceMediaRef?: OfflineMediaRef | null;
}

export interface OfflineShiftStartPayload {
  assignmentId: string;
  kmStart: number;
}

export interface OfflineShiftClosePayload {
  shiftId: string;
  kmEnd: number;
  revenueDeclared: number;
  collectionMode: CollectionMode;
  proofType: string;
  /** @deprecated Préférer proofMediaRef */
  proofValue: string;
  proofMediaRef?: OfflineMediaRef | null;
}

export interface OfflineFuelCreatePayload {
  fleetId: string;
  vehicleId: string;
  driverUserId: string;
  liters: number;
  amountXof: number;
  odometerKm: number;
  purchasedAt: string;
  stationName?: string | null;
  receiptRef?: string | null;
}

export interface OfflineDvirCreatePayload {
  fleetId: string;
  vehicleId: string;
  inspectedBy: string;
  inspectionType: "pre_trip" | "post_trip" | "weekly" | "periodic" | "interim";
  items: Record<string, { status: string; note?: string | null }>;
  notes?: string | null;
  odometerKm?: number | null;
  /** @deprecated Préférer photoMediaRefs */
  photoDataUrls?: string[];
  photoMediaRefs?: OfflineMediaRef[];
}

export interface OfflineMaintenanceNotePayload {
  fleetId: string;
  vehicleId: string;
  authorUserId: string;
  note: string;
  odometerKm?: number | null;
}

export interface OfflineScanLogPayload {
  fleetId: string;
  vehicleId: string;
  scannedBy: string;
  scannedAt: string;
  offline: boolean;
}

export type OfflineIncidentCreateJob = OfflineJobBase<
  "incident:create",
  OfflineIncidentCreatePayload
>;
export type OfflineShiftStartJob = OfflineJobBase<"shift:start", OfflineShiftStartPayload>;
export type OfflineShiftCloseJob = OfflineJobBase<"shift:close", OfflineShiftClosePayload>;
export type OfflineFuelCreateJob = OfflineJobBase<"fuel:create", OfflineFuelCreatePayload>;
export type OfflineDvirCreateJob = OfflineJobBase<"dvir:create", OfflineDvirCreatePayload>;
export type OfflineMaintenanceNoteJob = OfflineJobBase<
  "maintenance:note",
  OfflineMaintenanceNotePayload
>;
export type OfflineScanLogJob = OfflineJobBase<"scan:log", OfflineScanLogPayload>;

export type OfflineJob =
  | OfflineIncidentCreateJob
  | OfflineShiftStartJob
  | OfflineShiftCloseJob
  | OfflineFuelCreateJob
  | OfflineDvirCreateJob
  | OfflineMaintenanceNoteJob
  | OfflineScanLogJob;

export type ActionJournalEntryStatus = "local" | "synced" | "failed" | "conflict";

export interface ActionJournalEntry {
  id: string;
  jobType: OfflineJobType;
  jobId: string;
  summary: string;
  status: ActionJournalEntryStatus;
  createdAt: string;
  syncedAt: string | null;
  errorMessage: string | null;
}
