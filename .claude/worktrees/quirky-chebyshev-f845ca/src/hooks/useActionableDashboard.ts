import { useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useDashboard } from "@/hooks/useDashboard";
import { useDashboardKpis, useDashboardStats, useFleetVehicles } from "@/hooks/useDashboardStats";
import { toast } from "@/hooks/use-toast";
import { MaintenanceRepository } from "@/repositories/maintenance.repository";
import type { MaintenanceJob } from "@/hooks/useMaintenance";
import type { DashboardAlert, KpiSummary } from "@/types/dashboard";

const EMPTY_KPIS: KpiSummary = {
  activeVehicles: 0,
  inMaintenance: 0,
  criticalAlerts: 0,
  overdueServices: 0,
  deltaCritical: 0,
  deltaActive: 0,
};

const maintenanceRepository = new MaintenanceRepository();

const refetchIntervalWhenVisible = (visibleMs: number, hiddenMs = visibleMs * 3) => {
  if (typeof document === "undefined") return visibleMs;
  return document.visibilityState === "hidden" ? hiddenMs : visibleMs;
};

/** Interventions datées (retards + à venir) ; sinon file sans date planifiée pour le widget. */
async function fetchScheduledMaintenance(fleetId: string): Promise<MaintenanceJob[]> {
  const scheduled = await maintenanceRepository.findDashboardMaintenanceWindow(fleetId, {
    totalLimit: 10,
  });
  if (scheduled.length > 0) return scheduled;
  return maintenanceRepository.findAll({ fleet_id: fleetId, status: "queued", limit: 6 });
}

/**
 * Données pour le tableau de bord actionnable : KPIs, alertes, planning maintenance, stats flotte.
 */
export function useActionableDashboard() {
  const { orgId, userFleetId, isLoading: authLoading } = useAuth();
  const { alerts, loading: alertsLoading, resolveAlert } = useDashboard(orgId ?? "");
  const kpisQuery = useDashboardKpis();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: fleetVehicles = [], isLoading: fleetLoading } = useFleetVehicles();

  const kpis = useMemo((): KpiSummary | null => {
    if (kpisQuery.data) return kpisQuery.data;
    if (!orgId) return EMPTY_KPIS;
    return null;
  }, [kpisQuery.data, orgId]);

  const kpisLoading = Boolean(orgId) && kpisQuery.isLoading;

  const scheduledQuery = useQuery({
    queryKey: ["actionable-dashboard-maintenance", userFleetId],
    queryFn: () => fetchScheduledMaintenance(userFleetId!),
    enabled: !!userFleetId,
    staleTime: 20_000,
    refetchOnWindowFocus: true,
    refetchInterval: () => refetchIntervalWhenVisible(25_000),
    retry: 1,
  });

  const maintenanceErrorToastShown = useRef(false);
  useEffect(() => {
    if (scheduledQuery.isSuccess) {
      maintenanceErrorToastShown.current = false;
    }
  }, [scheduledQuery.isSuccess]);

  useEffect(() => {
    if (!scheduledQuery.isError || maintenanceErrorToastShown.current) return;
    maintenanceErrorToastShown.current = true;
    const message =
      scheduledQuery.error instanceof Error ? scheduledQuery.error.message : "Erreur réseau ou serveur.";
    toast({
      title: "Interventions indisponibles",
      description: `Les interventions planifiées n'ont pas pu être chargées. ${message}`,
      variant: "destructive",
    });
  }, [scheduledQuery.isError, scheduledQuery.error]);

  const avgKm = useMemo(() => {
    if (fleetVehicles.length === 0) return 0;
    const sum = fleetVehicles.reduce((s, v) => s + v.current_km, 0);
    return Math.round(sum / fleetVehicles.length);
  }, [fleetVehicles]);

  const loading =
    authLoading ||
    alertsLoading ||
    kpisLoading ||
    statsLoading ||
    fleetLoading ||
    (!!userFleetId && scheduledQuery.isLoading);
  const coreLoading = authLoading || alertsLoading || kpisLoading;

  return {
    kpis,
    alerts,
    resolveAlert,
    scheduledJobs: scheduledQuery.data ?? [],
    avgKm,
    todayRevenueXaf: stats?.todayRevenue ?? 0,
    totalVehicles: stats?.totalVehicles ?? 0,
    coreLoading,
    loading,
  };
}

export type UseActionableDashboardReturn = {
  kpis: KpiSummary | null;
  alerts: DashboardAlert[];
  resolveAlert: ReturnType<typeof useDashboard>["resolveAlert"];
  scheduledJobs: MaintenanceJob[];
  avgKm: number;
  todayRevenueXaf: number;
  totalVehicles: number;
  coreLoading: boolean;
  loading: boolean;
};
