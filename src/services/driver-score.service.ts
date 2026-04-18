import { DriverScoreRepository } from '@/repositories/driver-score.repository';
import type { DriverScoreLevel, DriverScoreRow } from '@/repositories/driver-score.repository';
import type { DriverScoreSnapshotRow } from '@/repositories/driver-score.repository';

export type { DriverScoreLevel };

export class DriverScoreService {
  constructor(private repository: DriverScoreRepository) {}

  async getDriverScores(fleetId: string): Promise<DriverScoreRow[]> {
    if (!fleetId) return [];
    return this.repository.findByFleet(fleetId);
  }

  async calculateDriverScore(
    driverUserId: string,
    fleetId: string,
    modelVersion: string = 'v1-hybrid',
  ): Promise<DriverScoreLevel> {
    if (!driverUserId || !fleetId) throw new Error('driverUserId et fleetId requis');
    return this.repository.calculateScoreV2(driverUserId, fleetId, modelVersion);
  }

  async getDriverScoreSnapshots(driverUserId: string, fleetId: string): Promise<DriverScoreSnapshotRow[]> {
    if (!driverUserId || !fleetId) return [];
    return this.repository.findSnapshotsByDriver(driverUserId, fleetId);
  }
}
