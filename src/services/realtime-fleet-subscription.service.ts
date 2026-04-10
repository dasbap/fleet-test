import type { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeFleetRepository } from "@/repositories/realtime-fleet.repository";
import { RealtimeNotificationService } from "@/services/realtime-notification.service";

const realtimeFleetRepository = new RealtimeFleetRepository();
const realtimeNotificationService = new RealtimeNotificationService(realtimeFleetRepository);

/** Délai de fusion des invalidations React Query (réduit le travail main thread). */
const INVALIDATION_BATCH_MS = 120;

export type RealtimeToastPayload = {
  title: string;
  description: string;
  variant?: "default" | "destructive";
};

export interface RealtimeFleetSubscriptionHandlers {
  onToast: (toast: RealtimeToastPayload) => void;
}

/**
 * Abonnements temps réel par flotte : canal Supabase + batching des invalidations.
 * Aucune logique métier ici — déléguée à {@link RealtimeNotificationService}.
 */
export class RealtimeFleetSubscriptionService {
  subscribe(fleetId: string, queryClient: QueryClient, handlers: RealtimeFleetSubscriptionHandlers): () => void {
    const pendingKeys = new Set<string>();
    let flushTimer: number | null = null;

    const flushInvalidations = () => {
      flushTimer = null;
      if (pendingKeys.size === 0) return;
      const keys: string[][] = [];
      pendingKeys.forEach((serialized) => {
        keys.push(JSON.parse(serialized) as string[]);
      });
      pendingKeys.clear();
      keys.forEach((key) => {
        void queryClient.invalidateQueries({ queryKey: key });
      });
    };

    const scheduleInvalidation = (invalidateKeys: string[][]) => {
      invalidateKeys.forEach((key) => {
        const normalized = key.filter(Boolean);
        if (normalized.length > 0) {
          pendingKeys.add(JSON.stringify(normalized));
        }
      });
      if (flushTimer !== null) return;
      flushTimer = window.setTimeout(flushInvalidations, INVALIDATION_BATCH_MS);
    };

    const channel = supabase.channel(`fleet-notifications-${fleetId}`);

    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "clotures_creneaux" },
      async (payload) => {
        const closure = payload.new as { shift_id?: string; revenue_declared?: number | null };
        const result = await realtimeNotificationService.handleClosureInsert(closure, fleetId);
        if (!result) return;
        const toastPayload = result.toast;
        if (toastPayload) {
          queueMicrotask(() => handlers.onToast(toastPayload));
        }
        scheduleInvalidation(result.invalidateKeys);
      },
    );

    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "incidents" },
      async (payload) => {
        const incident = payload.new as {
          vehicle_id?: string;
          severity?: string;
          description?: string;
        };
        const result = await realtimeNotificationService.handleIncidentInsert(incident, fleetId);
        if (!result) return;
        const toastPayload = result.toast;
        if (toastPayload) {
          queueMicrotask(() => handlers.onToast(toastPayload));
        }
        scheduleInvalidation(result.invalidateKeys);
      },
    );

    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "travaux_maintenance" },
      async (payload) => {
        const job = payload.new as { fleet_id?: string; vehicle_id?: string; priority?: string };
        const result = await realtimeNotificationService.handleMaintenanceInsert(job, fleetId);
        if (!result) return;
        const toastPayload = result.toast;
        if (toastPayload) {
          queueMicrotask(() => handlers.onToast(toastPayload));
        }
        scheduleInvalidation(result.invalidateKeys);
      },
    );

    channel.on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "travaux_maintenance" },
      async (payload) => {
        const newJob = payload.new as {
          id?: string;
          fleet_id?: string;
          vehicle_id?: string;
          status?: string;
        };
        const oldJob = payload.old as { status?: string };
        const result = await realtimeNotificationService.handleMaintenanceUpdate(
          { new: newJob, old: oldJob },
          fleetId,
        );
        if (!result) return;
        const toastPayload = result.toast;
        if (toastPayload) {
          queueMicrotask(() => handlers.onToast(toastPayload));
        }
        scheduleInvalidation(result.invalidateKeys);
      },
    );

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        if (import.meta.env.DEV) {
          console.log("✅ Real-time notifications active for fleet:", fleetId);
        }
      } else if (status === "CHANNEL_ERROR") {
        console.error("❌ Real-time subscription error");
      }
    });

    return () => {
      if (flushTimer !== null) {
        window.clearTimeout(flushTimer);
        flushTimer = null;
      }
      pendingKeys.clear();
      void supabase.removeChannel(channel);
    };
  }
}

export const realtimeFleetSubscriptionService = new RealtimeFleetSubscriptionService();
