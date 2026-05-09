import {
  getIncidentDrafts,
  saveIncidentDeclarationDraft,
} from "@/lib/storage/flotteEsambaLocalCache";

/**
 * Façade métier pour le stockage local (brouillons incidents, etc.).
 * Les implémentations reposent sur `localStorageService` et les clés `storageKeys`.
 */
export const storageService = {
  saveIncidentDeclarationDraft,
  getIncidentDrafts,
} as const;
