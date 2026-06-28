import { useEffect } from "react";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { OfflineQueueService } from "@/services/offlineQueue.service";
import { runOfflineSyncOnce } from "@/services/offlineSyncOrchestrator.service";
import { migrateLegacyIncidentDraftsToQueue } from "@/services/offlineSyncOrchestrator.service";
import { hydratePendingMediaStore } from "@/services/offline-media-storage.service";
import { initNetworkStatus, isNetworkOnline } from "@/lib/network/networkStatus";

const queueService = new OfflineQueueService();

/**
 * Composant sans rendu : orchestre la synchro hors-ligne au démarrage
 * et à chaque retour de connectivité.
 */
export function OfflinePendingSyncBridge() {
  const { isOnline } = useOfflineQueue();

  useEffect(() => {
    async function init() {
      await initNetworkStatus();
      hydratePendingMediaStore();
      await queueService.recoverStuckJobs();
      await migrateLegacyIncidentDraftsToQueue();
      if (isNetworkOnline()) {
        await runOfflineSyncOnce();
      }
    }
    void init();
  }, []);

  void isOnline;

  return null;
}
