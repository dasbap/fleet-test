import { useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useDashboard } from "@/hooks/useDashboard";
import { useDashboardKpis, useDashboardStats, useFleetVehicles } from "@/hooks/useDashboardStats";
import { toast } from "@/hooks/use-toast";
import { isMockAuthEnabled } from "@/lib/authMode";
import {
  buildDashboardKpisFallback,
  canFetchDashboardKpis,
  resolveActionableDashboardKpis,
} from "@/lib/dashboard-kpis";
import { isValidUuid } from "@/lib/isUuid";
import { MaintenanceRepository } from "@/repositories/maintenance.repository";
import type { MaintenanceJob } from "@/hooks/useMaintenance";
import type { DashboardAlert, KpiSummary } from "@/types/dashboard";
import { useFuelSummary } from "@/hooks/useFuelLogs";

const maintenanceRepository = new MaintenanceRepository();

const refetchIntervalWhenVisible = (visibleMs: number, hiddenMs = visibleMs * 3) => {
  if (typeof document === "undefined") return visibleMs;
  return document.visibilityState === "hidden" ? hiddenMs : visibleMs;
};

/** Interventions datées (retards + à venir) ; fallback file sans date si timeout ou vide. */
async function fetchScheduledMaintenance(fleetId: string): Promise<MaintenanceJob[]> {
  try {
    const scheduled = await maintenanceRepository.findDashboardMaintenanceWindow(fleetId, {
      totalLimit: 10,
    });
    if (scheduled.length > 0) return scheduled;
  } catch (err) {
    console.warn("Planning maintenance dashboard indisponible, fallback file:", err);
  }

  try {
    return await maintenanceRepository.findAll({ fleet_id: fleetId, status: "queued", limit: 6 });
  } catch {
    return [];
  }
}

/**
 * Données pour le tableau de bord actionnable : KPIs, alertes, planning maintenance, stats flotte.
 */
export function useActionableDashboard() {
  const {
    orgId,
    userFleetId,
    isLoading: authLoading,
    isTenantOrgLoading,
  } = useAuth();
  const skipRemoteKpis = isMockAuthEnabled();
  const alertsOrgId = orgId && isValidUuid(orgId) ? orgId : "";
  const { alerts, loading: alertsLoading, resolveAlert } = useDashboard(alertsOrgId);
  const kpisQuery = useDashboardKpis();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: fleetVehicles = [], isLoading: fleetLoading } = useFleetVehicles();
  const fuelSummary = useFuelSummary();

  const canFetchKpis = canFetchDashboardKpis(orgId, skipRemoteKpis);

  const fallbackKpis = useMemo(
    () =>
      stats !== undefined
        ? buildDashboardKpisFallback(stats, alerts)
        : null,
    [stats, alerts],
  );

  const { kpis, kpisDegraded } = useMemo(
    () =>
      resolveActionableDashboardKpis({
        orgId,
        kpisData: kpisQuery.data,
        isKpisError: kpisQuery.isError,
        skipRemoteKpis,
        fallbackKpis,
      }),
    [orgId, kpisQuery.data, kpisQuery.isError, skipRemoteKpis, fallbackKpis],
  );

  const kpisLoading = canFetchKpis && kpisQuery.isLoading;
  const kpiError =
    kpisQuery.isError && canFetchKpis
      ? kpisQuery.error instanceof Error
        ? kpisQuery.error.message
        : "Erreur réseau ou serveur."
      : null;

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
    isTenantOrgLoading ||
    alertsLoading ||
    kpisLoading ||
    statsLoading ||
    fleetLoading ||
    (!!userFleetId && scheduledQuery.isLoading);
  const coreLoading =
    authLoading || isTenantOrgLoading || alertsLoading || kpisLoading;

  return {
    kpis,
    kpisDegraded,
    kpiError,
    refetchKpis: kpisQuery.refetch,
    alerts,
    resolveAlert,
    scheduledJobs: scheduledQuery.data ?? [],
    avgKm,
    todayRevenueXaf: stats?.todayRevenue ?? 0,
    totalVehicles: stats?.totalVehicles ?? 0,
    fuelSpendXof: fuelSummary.totalAmountXof,
    fuelLiters: fuelSummary.totalLiters,
    coreLoading,
    loading,
  };
}

export type UseActionableDashboardReturn = {
  kpis: KpiSummary;
  kpisDegraded: boolean;
  kpiError: string | null;
  refetchKpis: () => Promise<unknown>;
  alerts: DashboardAlert[];
  resolveAlert: ReturnType<typeof useDashboard>["resolveAlert"];
  scheduledJobs: MaintenanceJob[];
  avgKm: number;
  todayRevenueXaf: number;
  totalVehicles: number;
  fuelSpendXof: number;
  fuelLiters: number;
  coreLoading: boolean;
  loading: boolean;
};
