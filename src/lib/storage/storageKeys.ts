/** Préfixe versionné pour éviter collisions et migrations futures. */
export const STORAGE_PREFIX = "flotte-esamba:v1:" as const;

export const storageKeys = {
  session: `${STORAGE_PREFIX}session`,
  recentMissions: `${STORAGE_PREFIX}recent-missions`,
  recentVehicles: `${STORAGE_PREFIX}recent-vehicles`,
  vehicleHistory: `${STORAGE_PREFIX}vehicle-history`,
  incidentDrafts: `${STORAGE_PREFIX}incident-drafts`,
  offlineQueue: `${STORAGE_PREFIX}offline-queue`,
  syncState: `${STORAGE_PREFIX}sync-state`,
  syncMetrics: `${STORAGE_PREFIX}sync-metrics`,
  shiftClosureDraft: `${STORAGE_PREFIX}shift-closure-draft`,
  /** Dernière liste véhicules consultée (hors ligne). */
  vehicleListSnapshot: `${STORAGE_PREFIX}vehicle-list-snapshot`,
} as const;
