/** Préfixe versionné pour éviter collisions et migrations futures. */
export const STORAGE_PREFIX = "flotte-esamba:v1:" as const;

export const storageKeys = {
  session: `${STORAGE_PREFIX}session`,
  recentMissions: `${STORAGE_PREFIX}recent-missions`,
  recentVehicles: `${STORAGE_PREFIX}recent-vehicles`,
  incidentDrafts: `${STORAGE_PREFIX}incident-drafts`,
  syncState: `${STORAGE_PREFIX}sync-state`,
} as const;
