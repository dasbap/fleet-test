import { useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useNetworkOnline } from "@/features/account/hooks/useNetworkOnline";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { syncQueue } from "@/services/syncQueue.service";
import { operationsQueryKeys } from "@/hooks/useOperations";

/**
 * Tente d’envoyer les saisies hors ligne lorsque le réseau revient (ou au montage si en ligne).
 * Utilise `syncQueue` (écoute `online` + même logique que le passage en ligne détecté par React).
 */
export function OfflinePendingSyncBridge() {
  const online = useNetworkOnline();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userRef = useRef(user);
  userRef.current = user;

  const handleSync = useCallback(async () => {
    if (!userRef.current) return;

    const { succeeded, failed } = await syncQueue.runPendingOfflineSync();
    if (succeeded > 0) {
      await queryClient.invalidateQueries({ queryKey: ["incidents"] });
      await queryClient.invalidateQueries({ queryKey: ["active-shift"] });
      await queryClient.invalidateQueries({ queryKey: ["driver-shifts"] });
      await queryClient.invalidateQueries({ queryKey: ["fuel-entries"] });
      await queryClient.invalidateQueries({ queryKey: operationsQueryKeys.all });
      toast({
        title: "Synchronisation",
        description:
          succeeded === 1
            ? "Une saisie hors ligne a été envoyée."
            : `${succeeded} saisies hors ligne ont été envoyées.`,
      });
    }
    if (failed > 0) {
      toast({
        title: "Synchronisation partielle",
        description: "Certains signalements n’ont pas pu être envoyés. Réessayez plus tard.",
        variant: "destructive",
      });
    }
  }, [queryClient]);

  useEffect(() => {
    if (!user || !online) return;
    void handleSync();
  }, [online, user, handleSync]);

  useEffect(() => {
    return syncQueue.setupNetworkListener(() => {
      if (!userRef.current || !navigator.onLine) return;
      void handleSync();
    });
  }, [handleSync]);

  return null;
}
