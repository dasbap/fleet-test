import { useEffect } from "react";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { runOfflineSyncOnce } from "@/services/offlineSyncOrchestrator.service";
import { migrateLegacyIncidentDraftsToQueue } from "@/services/offlineSyncOrchestrator.service";

/**
 * Composant sans rendu : orchestre la synchro hors-ligne au démarrage
 * et à chaque retour de connectivité.
 *
 * À monter une seule fois dans DashboardLayout ou TerrainLayout.
 */
export function OfflinePendingSyncBridge() {
  const { isOnline } = useOfflineQueue();

  // Synchro initiale au mount (si en ligne)
  useEffect(() => {
    async function init() {
      await migrateLegacyIncidentDraftsToQueue();
      if (navigator.onLine) {
        await runOfflineSyncOnce();
      }
    }
    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // isOnline change → le hook useOfflineQueue gère déjà le flush auto
  // Ce composant sert uniquement à garantir que le hook est monté
  void isOnline;

  return null;
}
