export type OfflineJobStatus = "pending" | "syncing" | "succeeded" | "failed";

export type OfflineJobType = "incident:create";

export interface OfflineJobBase<TType extends OfflineJobType = OfflineJobType, TPayload = unknown> {
  id: string;
  type: TType;
  payload: TPayload;
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

export type OfflineIncidentCreateJob = OfflineJobBase<
  "incident:create",
  OfflineIncidentCreatePayload
>;

export type OfflineJob = OfflineIncidentCreateJob;

