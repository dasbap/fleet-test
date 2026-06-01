import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { DashboardService } from '@/services/dashboard.service';
import { DashboardRepository } from '@/repositories/dashboard.repository';
import { DashboardAlertRepository } from '@/repositories/dashboard-alert.repository';
import { DashboardAlertService } from '@/services/dashboard-alert.service';
import { isMockAuthEnabled } from '@/lib/authMode';
import { canFetchDashboardKpis, DASHBOARD_EMPTY_KPIS } from '@/lib/dashboard-kpis';
import type { KpiSummary } from '@/types/dashboard';
import { queryKeys } from '@/lib/cache/queryKeys';
import {
  dashboardStaleTimeMs,
  refetchIntervalWhenVisible,
} from '@/lib/query/refetchPolicy';

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

const RECENT_INTERACTION_WINDOW_MS = 12_000;
let hasBoundInteractionListeners = false;
let lastInteractionAt = 0;

function bindInteractionListenersOnce() {
  if (hasBoundInteractionListeners || typeof window === "undefined") return;
  hasBoundInteractionListeners = true;
  const markInteraction = () => {
    lastInteractionAt = Date.now();
  };
  window.addEventListener("pointerdown", markInteraction, { passive: true });
  window.addEventListener("keydown", markInteraction, { passive: true });
  window.addEventListener("touchstart", markInteraction, { passive: true });
}

/** Ralentit le polling juste après interaction pour protéger l'INP perçu. */
const refetchIntervalForInteraction = (activeMs: number, relaxedMs: number) => {
  if (typeof window === "undefined") return activeMs;
  const elapsed = Date.now() - lastInteractionAt;
  return elapsed <= RECENT_INTERACTION_WINDOW_MS ? relaxedMs : activeMs;
};

export function useDashboardStats() {
  const { userFleetId } = useAuth();
  bindInteractionListenersOnce();

  return useQuery({
    queryKey: queryKeys.dashboard.stats(userFleetId ?? ''),
    queryFn: async (): Promise<DashboardStats> => {
      if (!userFleetId) return emptyStats;
      return dashboardService.getDashboardStats(userFleetId);
    },
    enabled: !!userFleetId,
    staleTime: dashboardStaleTimeMs(),
    refetchOnWindowFocus: true,
    refetchInterval: () =>
      refetchIntervalWhenVisible(refetchIntervalForInteraction(120_000, 180_000)),
  });
}

export function useDashboardKpis() {
  const { orgId } = useAuth();
  const skipRemoteKpis = isMockAuthEnabled();
  const canFetch = canFetchDashboardKpis(orgId, skipRemoteKpis);

  return useQuery({
    queryKey: queryKeys.dashboard.kpis(orgId ?? ''),
    queryFn: async (): Promise<KpiSummary> => {
      if (!orgId) return DASHBOARD_EMPTY_KPIS;
      return dashboardAlertService.getKpiSummary(orgId);
    },
    enabled: canFetch,
    retry: 1,
    staleTime: dashboardStaleTimeMs(),
    refetchOnWindowFocus: true,
    refetchInterval: () =>
      refetchIntervalWhenVisible(refetchIntervalForInteraction(120_000, 180_000)),
  });
}

export function useRecentActivity() {
  const { userFleetId } = useAuth();

  return useQuery({
    queryKey: ['recent-activity', userFleetId],
    queryFn: () => (userFleetId ? dashboardService.getRecentActivity(userFleetId) : []),
    enabled: !!userFleetId,
    staleTime: dashboardStaleTimeMs(),
    refetchOnWindowFocus: true,
    refetchInterval: () =>
      refetchIntervalWhenVisible(refetchIntervalForInteraction(120_000, 180_000)),
  });
}

export function useFleetVehicles() {
  const { userFleetId } = useAuth();

  return useQuery({
    queryKey: ['fleet-vehicles-overview', userFleetId],
    queryFn: () => (userFleetId ? dashboardService.getFleetVehiclesOverview(userFleetId) : []),
    enabled: !!userFleetId,
    staleTime: dashboardStaleTimeMs(),
    refetchOnWindowFocus: true,
    refetchInterval: () =>
      refetchIntervalWhenVisible(refetchIntervalForInteraction(120_000, 180_000)),
  });
}
