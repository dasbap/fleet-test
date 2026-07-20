import { DriverScoreRepository } from '@/repositories/driver-score.repository';
import type {
  DriverScoreLevel,
  DriverScoreRow,
  DriverScoreSnapshotRow,
  TopDriverScoreRow,
} from '@/repositories/driver-score.repository';

export type { DriverScoreLevel, TopDriverScoreRow };

export interface GetDriverScoresOptions {
  limit?: number;
}

const MAX_DRIVER_SCORES_LIMIT = 100;

function sanitizeLimit(limit?: number): number | undefined {
  if (typeof limit !== 'number' || !Number.isFinite(limit)) return undefined;
  if (limit <= 0) return undefined;
  return Math.min(Math.floor(limit), MAX_DRIVER_SCORES_LIMIT);
}

export class DriverScoreService {
  constructor(private repository: DriverScoreRepository) {}

  async getDriverScores(
    fleetId: string,
    options?: GetDriverScoresOptions,
  ): Promise<DriverScoreRow[]> {
    if (!fleetId) return [];
    return this.repository.findByFleet(fleetId, {
      limit: sanitizeLimit(options?.limit),
    });
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

  async getTopDriverScores(fleetId: string, limit = 10): Promise<TopDriverScoreRow[]> {
    if (!fleetId) return [];
    const safeLimit = sanitizeLimit(limit) ?? 10;
    return this.repository.findTopByFleet(fleetId, safeLimit);
  }
}
