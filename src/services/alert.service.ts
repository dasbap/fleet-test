import { AlertRepository } from '@/repositories/alert.repository';
import type { AlertRow } from '@/repositories/alert.repository';

export class AlertService {
  constructor(private repository: AlertRepository) {}

  async getUnresolvedAlerts(fleetId: string): Promise<AlertRow[]> {
    if (!fleetId) return [];
    return this.repository.findUnresolvedByFleet(fleetId);
  }

  async getAlertByIdForFleet(alertId: string, fleetId: string): Promise<AlertRow | null> {
    if (!alertId || !fleetId) {
      return null;
    }
    const row = await this.repository.findById(alertId);
    if (!row || row.fleet_id !== fleetId) {
      return null;
    }
    return row;
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
