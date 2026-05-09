import { DashboardRepository } from '@/repositories/dashboard.repository';
import type {
  DashboardStats,
  RecentActivityItem,
  FleetVehicleOverviewItem,
} from '@/repositories/dashboard.repository';

/**
 * Service pour la logique métier du tableau de bord
 */
export class DashboardService {
  constructor(private repository: DashboardRepository) {}

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
}
