/**
 * Mission / ordre de mission (livraison, rotation, intervention).
 */
export type MissionStatus =
  | "draft"
  | "assigned"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface Mission {
  id: string;
  fleetId: string;
  title: string;
  reference: string | null;
  status: MissionStatus;
  vehicleId: string | null;
  driverUserId: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MissionStep {
  id: string;
  missionId: string;
  label: string;
  order: number;
  done: boolean;
}
