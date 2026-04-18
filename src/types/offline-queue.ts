export type OfflineJobStatus = "pending" | "syncing" | "succeeded" | "failed";

export type OfflineJobType = "incident:create" | "shift:start" | "shift:close" | "fuel:create";

export interface OfflineJobBase<TType extends OfflineJobType = OfflineJobType, TPayload = unknown> {
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
  evidenceDataUrl?: string | null;
}

export interface OfflineShiftStartPayload {
  assignmentId: string;
  kmStart: number;
}

export interface OfflineShiftClosePayload {
  shiftId: string;
  kmEnd: number;
  revenueDeclared: number;
  collectionMode: "cash" | "momo" | "mix";
  proofType: string;
  proofValue: string;
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

export type OfflineIncidentCreateJob = OfflineJobBase<
  "incident:create",
  OfflineIncidentCreatePayload
>;

export type OfflineShiftStartJob = OfflineJobBase<"shift:start", OfflineShiftStartPayload>;
export type OfflineShiftCloseJob = OfflineJobBase<"shift:close", OfflineShiftClosePayload>;
export type OfflineFuelCreateJob = OfflineJobBase<"fuel:create", OfflineFuelCreatePayload>;

export type OfflineJob =
  | OfflineIncidentCreateJob
  | OfflineShiftStartJob
  | OfflineShiftCloseJob
  | OfflineFuelCreateJob;

