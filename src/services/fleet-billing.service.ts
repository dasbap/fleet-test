import { FleetBillingRepository } from "@/repositories/fleet-billing.repository";
import { normalizeFleetBillingContext } from "@/lib/fleet-billing-context";
import { planValueMessages } from "@/lib/plan-value-messages";
import type { FleetBillingContext } from "@/types/fleet-billing";

export class FleetBillingService {
  constructor(private repository: FleetBillingRepository) {}

  async getFleetBillingContext(fleetId: string): Promise<FleetBillingContext> {
    if (!fleetId?.trim()) {
      throw new Error("L'identifiant de la flotte est requis.");
    }
    const raw = await this.repository.getFleetBillingContextRpc(fleetId);
    return normalizeFleetBillingContext(raw);
  }

  /**
   * Vérifie qu’un véhicule supplémentaire est autorisé (UX avant insert ; le trigger SQL reste autoritaire).
   */
  assertCanAddVehicle(context: FleetBillingContext): void {
    if (context.vehicleCount >= context.maxVehicles) {
      throw new Error(planValueMessages.vehicleLimit.short);
    }
  }
}
