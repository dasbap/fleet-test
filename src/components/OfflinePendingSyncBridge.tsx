import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/useAuth";
import { useNetworkOnline } from "@/features/account/hooks/useNetworkOnline";
import { countPendingIncidentDrafts } from "@/lib/storage/flotteEsambaLocalCache";
import { syncPendingIncidentDrafts } from "@/services/offlineIncidentSync.service";
import { toast } from "@/hooks/use-toast";

/**
 * Tente d’envoyer les brouillons d’incidents lorsque le réseau revient (ou au montage si en ligne).
 */
export function OfflinePendingSyncBridge() {
  const online = useNetworkOnline();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user || !online) return;
    if (countPendingIncidentDrafts() === 0) return;

    void (async () => {
      const { synced, failed } = await syncPendingIncidentDrafts();
      if (synced > 0) {
        await queryClient.invalidateQueries({ queryKey: ["incidents"] });
        toast({
          title: "Synchronisation",
          description:
            synced === 1
              ? "Un signalement hors ligne a été envoyé."
              : `${synced} signalements hors ligne ont été envoyés.`,
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
