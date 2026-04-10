import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DashboardAlertService } from "@/services/dashboard-alert.service";
import { DashboardAlertRepository } from "@/repositories/dashboard-alert.repository";
import type { DashboardAlert } from "@/types/dashboard";
import { useTrackFunnelEvent } from "@/hooks/useFunnelTelemetry";
import { useRealtimeWorker } from "@/hooks/useRealtimeWorker";

const dashboardAlertRepository = new DashboardAlertRepository();
const dashboardAlertService = new DashboardAlertService(dashboardAlertRepository);

function isSharedWorkerAvailable(): boolean {
  return typeof SharedWorker !== "undefined";
}

export function useDashboard(orgId: string) {
  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();
  const { trackEvent } = useTrackFunnelEvent(orgId || undefined);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const alertsData = await dashboardAlertService.getActiveAlerts(orgId);
        setAlerts(alertsData);
      } finally {
        setLoading(false);
      }
    }

    if (orgId) {
      load();
    } else {
      setAlerts([]);
      setLoading(false);
    }
  }, [orgId]);

  useRealtimeWorker({
    orgId: isSharedWorkerAvailable() && orgId ? orgId : null,
    onMessage: useCallback(
      (msg) => {
        switch (msg.type) {
          case "ALERT_INSERT":
            try {
              const alert = dashboardAlertService.mapRealtimePayloadToAlert(msg.payload);
              setAlerts((prev) => [alert, ...prev]);
              void queryClient.invalidateQueries({ queryKey: ["dashboard-kpis", orgId] });
            } catch {
              /* payload ignoré */
            }
            break;
          case "ALERT_UPDATE":
            try {
              const alert = dashboardAlertService.mapRealtimePayloadToAlert(msg.payload);
              setAlerts((prev) => prev.map((a) => (a.id === alert.id ? alert : a)));
              void queryClient.invalidateQueries({ queryKey: ["dashboard-kpis", orgId] });
            } catch {
              /* payload ignoré */
            }
            break;
          case "DISCONNECTED":
            console.warn("[Dashboard] Realtime (worker) déconnecté");
            break;
          case "ERROR":
            console.error("[Dashboard] Realtime (worker):", msg.message);
            break;
          default:
            break;
        }
      },
      [orgId, queryClient],
    ),
  });

  useEffect(() => {
    if (!orgId || isSharedWorkerAvailable()) {
      return;
    }

    const channel = dashboardAlertService.subscribeToAlerts(orgId, {
      onInsert: (alert) => {
        setAlerts((prev) => [alert, ...prev]);
        void queryClient.invalidateQueries({ queryKey: ["dashboard-kpis", orgId] });
      },
      onUpdate: (alert) => {
        setAlerts((prev) => prev.map((a) => (a.id === alert.id ? alert : a)));
        void queryClient.invalidateQueries({ queryKey: ["dashboard-kpis", orgId] });
      },
    });

    return () => {
      dashboardAlertService.unsubscribe(channel);
    };
  }, [orgId, queryClient]);

  const resolveAlert = useCallback(
    async (alertId: string, action: DashboardAlert["action"]) => {
      const previousAlerts = alerts;
      trackEvent({
        eventType: "one_click_attempt",
        context: { alertId, actionKind: action.kind },
      });

      setAlerts((prev) => prev.filter((a) => a.id !== alertId));

      try {
        await dashboardAlertService.resolveAlert(alertId, action);
        trackEvent({
          eventType: "one_click_success",
          context: { alertId, actionKind: action.kind },
        });
      } catch (error) {
        trackEvent({
          eventType: "one_click_failure",
          status: "error",
          context: { alertId, actionKind: action.kind, message: error instanceof Error ? error.message : "unknown" },
        });
        setAlerts(previousAlerts);
        throw error;
      }
    },
    [alerts, trackEvent]
  );

  return { alerts, loading, resolveAlert };
}
