import { countPendingIncidentDrafts } from "@/lib/storage/flotteEsambaLocalCache";
import {
  migrateLegacyIncidentDraftsToQueue,
  runOfflineSyncOnce,
  type SyncResultSummary,
} from "@/services/offlineSyncOrchestrator.service";

export type { SyncResultSummary };

/**
 * Migre les brouillons legacy puis exécute une passe de synchronisation hors ligne.
 */
export async function runPendingOfflineSync(): Promise<SyncResultSummary> {
  if (countPendingIncidentDrafts() > 0) {
    await migrateLegacyIncidentDraftsToQueue();
  }
  return runOfflineSyncOnce();
}

let activeOnlineCleanup: (() => void) | null = null;

/**
 * Enregistre l’écouteur `window` `online` de façon idempotente (retire l’écouteur précédent).
 * Retourne une fonction de nettoyage qui retire uniquement l’écouteur de cet appel.
 */
export function setupNetworkListener(
  onOnline: () => void | Promise<void>,
): () => void {
  activeOnlineCleanup?.();
  const wrapped = () => {
    void onOnline();
  };
  window.addEventListener("online", wrapped);
  const cleanup = () => {
    window.removeEventListener("online", wrapped);
    if (activeOnlineCleanup === cleanup) {
      activeOnlineCleanup = null;
    }
  };
  activeOnlineCleanup = cleanup;
  return cleanup;
}

export const syncQueue = {
  runPendingOfflineSync,
  setupNetworkListener,
};
