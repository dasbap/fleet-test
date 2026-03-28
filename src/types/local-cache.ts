import type { AccountSyncDisplayStatus } from "@/types/account-preferences";
import type { IncidentSeverity } from "@/repositories/incident.repository";
import type { IncidentCategory } from "@/types/incident-declaration";
import type { MissionStatus } from "@/types/mission";

/**
 * Copie locale minimale de session pour affichage / logique hors ligne (le JWT reste géré par Supabase).
 */
export interface LocalSessionSnapshot {
  userId: string;
  email: string | null;
  activeFleetId: string | null;
  role: string | null;
  updatedAt: string;
}

/** Mission récemment consultée ou mise en cache pour liste hors ligne. */
export interface CachedRecentMission {
  id: string;
  fleetId: string;
  title: string;
  reference: string | null;
  status: MissionStatus;
  cachedAt: string;
}

/** Véhicule récemment consulté (fiche détail). */
export interface CachedRecentVehicle {
  vehicleId: string;
  fleetId: string;
  registration: string;
  label: string;
  viewedAt: string;
}

/** Brouillon de déclaration d’incident en attente de synchronisation. */
export interface IncidentDeclarationDraft {
  id: string;
  fleetId: string;
  vehicleId: string;
  driverUserId: string;
  description: string;
  severity: IncidentSeverity;
  incidentCategory?: IncidentCategory;
  latitude?: number | null;
  longitude?: number | null;
  /** Data URL ou base64 pour téléversement différé. */
  evidenceDataUrl?: string | null;
  createdAt: string;
  status: "pending" | "syncing" | "failed";
  lastError?: string;
}

/** État de synchronisation persisté (affiche Compte + logique métier). */
export interface LocalSyncState {
  lastSuccessfulSyncAt: string | null;
  displayStatus: AccountSyncDisplayStatus;
  lastSyncError: string | null;
}
