import { useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { scheduleDeferredMainThreadWork } from "@/lib/performance/deferredMainThreadWork";

/**
 * Abonnement temps réel flotte : délègue au service (batching invalidations, pas de logique métier ici).
 */
export function useRealtimeNotifications(fleetId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!fleetId) return;

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    const cancelScheduled = scheduleDeferredMainThreadWork(() => {
      void import("@/services/realtime-fleet-subscription.service")
        .then(({ realtimeFleetSubscriptionService }) => {
          if (cancelled) return;
          unsubscribe = realtimeFleetSubscriptionService.subscribe(fleetId, queryClient, {
            onToast: (payload) => {
              toast(payload);
            },
          });
        })
        .catch((error) => {
          console.error("Échec du chargement Realtime flotte:", error);
        });
    }, { delayMs: 1_500, idleTimeoutMs: 4_000 });

    return () => {
      cancelled = true;
      cancelScheduled();
      unsubscribe?.();
    };
  }, [fleetId, queryClient]);
}
