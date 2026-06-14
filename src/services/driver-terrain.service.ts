import {
  DriverTerrainRepository,
  type DriverTerrainSelfCheckResult,
} from "@/repositories/driver-terrain.repository";

export type { DriverTerrainSelfCheckResult };

/**
 * Logique métier activation conducteur terrain.
 */
export class DriverTerrainService {
  constructor(private repository: DriverTerrainRepository) {}

  async getSelfCheck(userId: string, fleetId: string): Promise<DriverTerrainSelfCheckResult> {
    if (!userId || !fleetId) {
      throw new Error("Utilisateur et flotte requis");
    }
    return this.repository.selfCheck(userId, fleetId);
  }
}
