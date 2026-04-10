import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { DashboardService } from '@/services/dashboard.service';
import { DashboardRepository } from '@/repositories/dashboard.repository';
import { DashboardAlertRepository } from '@/repositories/dashboard-alert.repository';
import { DashboardAlertService } from '@/services/dashboard-alert.service';
import type { KpiSummary } from '@/types/dashboard';

const dashboardRepository = new DashboardRepository();
const dashboardService = new DashboardService(dashboardRepository);
const dashboardAlertRepository = new DashboardAlertRepository();
const dashboardAlertService = new DashboardAlertService(dashboardAlertRepository);

export interface DashboardStats {
  activeVehicles: number;
  totalVehicles: number;
  blockedVehicles: number;
  activeDrivers: number;
  totalDrivers: number;
  pendingIncidents: number;
  todayRevenue: number;
  pendingClosures: number;
  maintenanceInProgress: number;
}

const emptyStats: DashboardStats = {
  activeVehicles: 0,
  totalVehicles: 0,
  blockedVehicles: 0,
  activeDrivers: 0,
  totalDrivers: 0,
  pendingIncidents: 0,
  todayRevenue: 0,
  pendingClosures: 0,
  maintenanceInProgress: 0,
};

/** Onglet caché : pas de polling (moins de travail main thread ; refresh au retour via refetchOnWindowFocus). */
const refetchIntervalWhenVisible = (visibleMs: number) => {
  if (typeof document === "undefined") return visibleMs;
  return document.visibilityState === "hidden" ? false : visibleMs;
};

export function useDashboardStats() {
  const { userFleetId } = useAuth();

  return useQuery({
    queryKey: ['dashboard-stats', userFleetId],
    queryFn: async (): Promise<DashboardStats> => {
      if (!userFleetId) return emptyStats;
      return dashboardService.getDashboardStats(userFleetId);
    },
    enabled: !!userFleetId,
    staleTime: 20_000,
    refetchOnWindowFocus: true,
    refetchInterval: () => refetchIntervalWhenVisible(30_000),
  });
}

export function useDashboardKpis() {
  const { orgId } = useAuth();

  return useQuery({
    queryKey: ['dashboard-kpis', orgId],
    queryFn: async (): Promise<KpiSummary | null> => {
      if (!orgId) return null;
      return dashboardAlertService.getKpiSummary(orgId);
    },
    enabled: !!orgId,
    staleTime: 20_000,
    refetchOnWindowFocus: true,
    refetchInterval: () => refetchIntervalWhenVisible(30_000),
  });
}

export function useRecentActivity() {
  const { userFleetId } = useAuth();

  return useQuery({
    queryKey: ['recent-activity', userFleetId],
    queryFn: () => (userFleetId ? dashboardService.getRecentActivity(userFleetId) : []),
    enabled: !!userFleetId,
    staleTime: 25_000,
    refetchOnWindowFocus: true,
    refetchInterval: () => refetchIntervalWhenVisible(30_000),
  });
}

export function useFleetVehicles() {
  const { userFleetId } = useAuth();

  return useQuery({
    queryKey: ['fleet-vehicles-overview', userFleetId],
    queryFn: () => (userFleetId ? dashboardService.getFleetVehiclesOverview(userFleetId) : []),
    enabled: !!userFleetId,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}
