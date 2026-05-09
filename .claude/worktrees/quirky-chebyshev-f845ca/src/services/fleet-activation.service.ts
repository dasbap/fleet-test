import { FleetActivationRepository } from '@/repositories/fleet-activation.repository';
import type { ActivationMetrics } from '@/types/activation-metrics';

export class FleetActivationService {
  constructor(private repository: FleetActivationRepository) {}

  async getFleetActivationMetrics(fleetId: string): Promise<ActivationMetrics> {
    if (!fleetId?.trim()) {
      throw new Error("L'identifiant de la flotte est requis");
    }
    return this.repository.getMetricsByFleetId(fleetId);
  }
}
