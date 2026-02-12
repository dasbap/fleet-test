import { DriverScoreRepository } from '@/repositories/driver-score.repository';
import type { DriverScoreRow } from '@/repositories/driver-score.repository';

export class DriverScoreService {
  constructor(private repository: DriverScoreRepository) {}

  async getDriverScores(fleetId: string): Promise<DriverScoreRow[]> {
    if (!fleetId) return [];
    return this.repository.findByFleet(fleetId);
  }

  async calculateDriverScore(driverUserId: string, fleetId: string): Promise<unknown> {
    if (!driverUserId || !fleetId) throw new Error('driverUserId et fleetId requis');
    return this.repository.calculateScore(driverUserId, fleetId);
  }
}
