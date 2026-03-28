import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { RealtimeFleetRepository } from "@/repositories/realtime-fleet.repository";

const realtimeFleetRepository = new RealtimeFleetRepository();

export function useRealtimeNotifications(fleetId?: string) {
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!fleetId) return;

    const channel = supabase.channel(`fleet-notifications-${fleetId}`);
    channelRef.current = channel;

    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "clotures_creneaux",
      },
      async (payload) => {
        const closure = payload.new as { shift_id?: string; revenue_declared?: number | null };
        if (!closure.shift_id) return;

        const ctx = await realtimeFleetRepository.getClosureNotificationContext(
          closure.shift_id,
          closure,
          fleetId,
        );
        if (!ctx) return;

        toast({
          title: "🔔 Nouvelle clôture de créneau",
          description: `${ctx.driverFullName || "Un chauffeur"} a terminé son créneau avec ${ctx.revenueDeclared} FCFA de revenus.`,
        });

        queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
        queryClient.invalidateQueries({ queryKey: ["recent-activity"] });
      },
    );

    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "incidents",
      },
      async (payload) => {
        const incident = payload.new as {
          vehicle_id?: string;
          severity?: string;
          description?: string;
        };
        if (!incident.vehicle_id) return;

        const vehicle = await realtimeFleetRepository.getVehicleForIncident(incident.vehicle_id);
        if (!vehicle || vehicle.fleet_id !== fleetId) return;

        const severityLabels: Record<string, string> = {
          low: "faible",
          medium: "moyenne",
          high: "haute",
          critical: "critique",
        };

        toast({
          title: `⚠️ Nouvel incident (${severityLabels[incident.severity ?? ""] || incident.severity})`,
          description: `Véhicule ${vehicle.registration || "inconnu"}: ${String(incident.description ?? "").slice(0, 50)}...`,
          variant: incident.severity === "critical" ? "destructive" : "default",
        });

        queryClient.invalidateQueries({ queryKey: ["incidents"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
        queryClient.invalidateQueries({ queryKey: ["recent-activity"] });
      },
    );

    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "travaux_maintenance",
      },
      async (payload) => {
        const job = payload.new as { fleet_id?: string; vehicle_id?: string; priority?: string };
        if (job.fleet_id !== fleetId || !job.vehicle_id) return;

        const registration = await realtimeFleetRepository.getVehicleRegistration(job.vehicle_id);

        const priorityLabels: Record<string, string> = {
          low: "basse",
          medium: "moyenne",
          high: "haute",
          critical: "critique",
        };

        toast({
          title: "🔧 Nouvelle intervention de maintenance",
          description: `Véhicule ${registration || "inconnu"} - Priorité ${priorityLabels[job.priority ?? ""] || job.priority}`,
        });

        queryClient.invalidateQueries({ queryKey: ["maintenance-jobs"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      },
    );

    channel.on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "travaux_maintenance",
      },
      async (payload) => {
        const job = payload.new as {
          id?: string;
          fleet_id?: string;
          vehicle_id?: string;
          status?: string;
        };
        const oldJob = payload.old as { status?: string };
        if (job.fleet_id !== fleetId || job.status === oldJob.status || !job.vehicle_id) return;

        const registration = await realtimeFleetRepository.getVehicleRegistration(job.vehicle_id);

        const statusLabels: Record<string, string> = {
          queued: "en attente",
          in_progress: "en cours",
          ready: "terminée ✅",
          blocked: "bloquée ⛔",
        };

        toast({
          title: "🔧 Statut maintenance mis à jour",
          description: `${registration || "Véhicule"}: ${statusLabels[job.status ?? ""] || job.status}`,
        });

        queryClient.invalidateQueries({ queryKey: ["maintenance-jobs"] });
        queryClient.invalidateQueries({ queryKey: ["maintenance-job", job.id] });
      },
    );

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.log("✅ Real-time notifications active for fleet:", fleetId);
      } else if (status === "CHANNEL_ERROR") {
        console.error("❌ Real-time subscription error");
      }
    });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [fleetId, queryClient]);
}
