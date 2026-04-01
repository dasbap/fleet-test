import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useNetworkOnline } from "@/features/account/hooks/useNetworkOnline";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { countPendingIncidentDrafts } from "@/lib/storage/flotteEsambaLocalCache";
import { migrateLegacyIncidentDraftsToQueue, runOfflineSyncOnce } from "@/services/offlineSyncOrchestrator.service";

/**
 * Tente d’envoyer les brouillons d’incidents lorsque le réseau revient (ou au montage si en ligne).
 */
export function OfflinePendingSyncBridge() {
  const online = useNetworkOnline();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user || !online) return;

    void (async () => {
      if (countPendingIncidentDrafts() > 0) {
        migrateLegacyIncidentDraftsToQueue();
      }

      const { succeeded, failed } = await runOfflineSyncOnce();
      if (succeeded > 0) {
        await queryClient.invalidateQueries({ queryKey: ["incidents"] });
        toast({
          title: "Synchronisation",
          description:
            succeeded === 1
              ? "Un signalement hors ligne a été envoyé."
              : `${succeeded} signalements hors ligne ont été envoyés.`,
        });
      }
      if (failed > 0) {
        toast({
          title: "Synchronisation partielle",
          description: "Certains signalements n’ont pas pu être envoyés. Réessayez plus tard.",
          variant: "destructive",
        });
      }
    })();
  }, [online, user, queryClient]);

  return null;
}
