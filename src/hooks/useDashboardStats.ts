import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { DashboardService } from '@/services/dashboard.service';
import { DashboardRepository } from '@/repositories/dashboard.repository';

const dashboardRepository = new DashboardRepository();
const dashboardService = new DashboardService(dashboardRepository);

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

export function useDashboardStats() {
  const { userFleetId } = useAuth();

  return useQuery({
    queryKey: ['dashboard-stats', userFleetId],
    queryFn: async (): Promise<DashboardStats> => {
      if (!userFleetId) return emptyStats;
      return dashboardService.getDashboardStats(userFleetId);
    },
    enabled: !!userFleetId,
    refetchInterval: 30000,
  });
}

export function useRecentActivity() {
  const { userFleetId } = useAuth();

  return useQuery({
    queryKey: ['recent-activity', userFleetId],
    queryFn: () => (userFleetId ? dashboardService.getRecentActivity(userFleetId) : []),
    enabled: !!userFleetId,
    refetchInterval: 30000,
  });
}

export function useFleetVehicles() {
  const { userFleetId } = useAuth();

  return useQuery({
    queryKey: ['fleet-vehicles-overview', userFleetId],
    queryFn: () => (userFleetId ? dashboardService.getFleetVehiclesOverview(userFleetId) : []),
    enabled: !!userFleetId,
  });
}
