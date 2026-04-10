import { useState, useEffect, useCallback } from "react";
import { DashboardAlertService } from "@/services/dashboard-alert.service";
import { DashboardAlertRepository } from "@/repositories/dashboard-alert.repository";
import type { DashboardAlert, KpiSummary } from "@/types/dashboard";

const dashboardAlertRepository = new DashboardAlertRepository();
const dashboardAlertService = new DashboardAlertService(dashboardAlertRepository);

export function useDashboard(orgId: string) {
  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
  const [kpis, setKpis] = useState<KpiSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [alertsData, kpiData] = await Promise.all([
          dashboardAlertService.getActiveAlerts(orgId),
          dashboardAlertService.getKpiSummary(orgId),
        ]);
        setAlerts(alertsData);
        setKpis(kpiData);
      } finally {
        setLoading(false);
      }
    }

    if (orgId) {
      load();
    } else {
      setAlerts([]);
      setKpis(null);
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (!orgId) {
      return;
    }

    const channel = dashboardAlertService.subscribeToAlerts(orgId, {
      onInsert: (alert) => {
        setAlerts((prev) => [alert, ...prev]);
        setKpis((prev) =>
          prev ? { ...prev, criticalAlerts: prev.criticalAlerts + 1 } : prev
        );
      },
      onUpdate: (alert) => {
        setAlerts((prev) => prev.map((a) => (a.id === alert.id ? alert : a)));
      },
    });

    return () => {
      dashboardAlertService.unsubscribe(channel);
    };
  }, [orgId]);

  const resolveAlert = useCallback(
    async (alertId: string, action: DashboardAlert["action"]) => {
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      setKpis((prev) =>
        prev
          ? { ...prev, criticalAlerts: Math.max(0, prev.criticalAlerts - 1) }
          : prev
      );

      await dashboardAlertService.resolveAlert(alertId, action);
    },
    []
  );

  return { alerts, kpis, loading, resolveAlert };
}
