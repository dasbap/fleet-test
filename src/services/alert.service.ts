import { AlertRepository } from '@/repositories/alert.repository';
import type { AlertRow } from '@/repositories/alert.repository';

export class AlertService {
  constructor(private repository: AlertRepository) {}

  async getUnresolvedAlerts(fleetId: string): Promise<AlertRow[]> {
    if (!fleetId) return [];
    return this.repository.findUnresolvedByFleet(fleetId);
  }

  async generateAlerts(fleetId: string): Promise<unknown> {
    if (!fleetId) throw new Error('ID de flotte requis');
    return this.repository.generateAlerts(fleetId);
  }

  async resolveAlert(alertId: string, resolvedBy: string): Promise<void> {
    if (!alertId || !resolvedBy) throw new Error('alertId et resolvedBy requis');
    return this.repository.resolve(alertId, resolvedBy);
  }
}
