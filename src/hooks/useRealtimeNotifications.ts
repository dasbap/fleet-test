import { useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { realtimeFleetSubscriptionService } from "@/services/realtime-fleet-subscription.service";

/**
 * Abonnement temps réel flotte : délègue au service (batching invalidations, pas de logique métier ici).
 */
export function useRealtimeNotifications(fleetId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!fleetId) return;

    const unsubscribe = realtimeFleetSubscriptionService.subscribe(fleetId, queryClient, {
      onToast: (payload) => {
        toast(payload);
      },
    });

    return unsubscribe;
  }, [fleetId, queryClient]);
}
