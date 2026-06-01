import { DashboardRepository } from '@/repositories/dashboard.repository';
import type {
  DashboardStats,
  DashboardSnapshot,
  RecentActivityItem,
  FleetVehicleOverviewItem,
} from '@/repositories/dashboard.repository';
import type { FleetMetrics } from '@/types/fleet-metrics';

/**
 * Service pour la logique métier du tableau de bord
 */
export class DashboardService {
  constructor(private repository: DashboardRepository) {}

  async getDashboardSnapshot(fleetId: string, orgId: string): Promise<DashboardSnapshot> {
    if (!fleetId || !orgId) {
      throw new Error("La flotte et l'organisation sont requises");
    }
    return this.repository.getDashboardSnapshot(fleetId, orgId);
  }

  async getDashboardStats(fleetId: string): Promise<DashboardStats> {
    if (!fleetId) {
      throw new Error('L\'ID de la flotte est requis');
    }
    return this.repository.getStats(fleetId);
  }

  async getRecentActivity(fleetId: string): Promise<RecentActivityItem[]> {
    if (!fleetId) {
      return [];
    }
    return this.repository.getRecentActivity(fleetId);
  }

  async getFleetVehiclesOverview(fleetId: string): Promise<FleetVehicleOverviewItem[]> {
    if (!fleetId) {
      return [];
    }
    return this.repository.getFleetVehiclesOverview(fleetId);
  }

  async getFleetMetricsCached(fleetId: string): Promise<FleetMetrics> {
    if (!fleetId) {
      throw new Error("L'ID de la flotte est requis");
    }
    return this.repository.getMetricsCached(fleetId);
  }

  async invalidateFleetMetricsCache(fleetId: string): Promise<void> {
    if (!fleetId) {
      throw new Error("L'ID de la flotte est requis");
    }
    await this.repository.invalidateMetricsCache(fleetId);
  }
}
