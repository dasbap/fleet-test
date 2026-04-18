import {
  WhatsappMonitoringRepository,
  type WhatsappFailureItem,
  type WhatsappMonitoringStats,
} from "@/repositories/whatsapp-monitoring.repository";

export interface WhatsappMonitoringData {
  stats: WhatsappMonitoringStats;
  recentFailures: WhatsappFailureItem[];
}

export class WhatsappMonitoringService {
  constructor(private repository: WhatsappMonitoringRepository) {}

  async getMonitoringData(fleetId: string): Promise<WhatsappMonitoringData> {
    if (!fleetId) {
      return {
        stats: {
          total24h: 0,
          failed24h: 0,
          retryScheduled: 0,
          successRate24h: 0,
        },
        recentFailures: [],
      };
    }

    const [stats, recentFailures] = await Promise.all([
      this.repository.getStats(fleetId),
      this.repository.getRecentFailures(fleetId),
    ]);

    return { stats, recentFailures };
  }
}
