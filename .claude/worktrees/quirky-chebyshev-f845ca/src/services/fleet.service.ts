import { FleetRepository } from '@/repositories/fleet.repository';
import type { FleetInfo } from '@/repositories/fleet.repository';

/**
 * Service pour la logique métier des flottes (liste utilisateur, etc.)
 */
export class FleetService {
  constructor(private repository: FleetRepository) {}

  /**
   * Récupère les flottes par liste d'IDs.
   */
  async getFleetsByIds(fleetIds: string[]): Promise<FleetInfo[]> {
    if (!fleetIds?.length) return [];
    return this.repository.findByIds(fleetIds);
  }
}
