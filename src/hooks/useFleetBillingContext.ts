import { useQuery } from "@tanstack/react-query";
import { useAuthOptional } from "@/hooks/useAuth";
import { FleetBillingService } from "@/services/fleet-billing.service";
import { FleetBillingRepository } from "@/repositories/fleet-billing.repository";
import type { FleetBillingContext } from "@/types/fleet-billing";
const fleetBillingRepository = new FleetBillingRepository();
const fleetBillingService = new FleetBillingService(fleetBillingRepository);

/**
 * Contexte facturation et droits (plan effectif, plafond véhicules, finance, IA).
 */
export function useFleetBillingContext(fleetId?: string) {
  const userFleetId = useAuthOptional()?.userFleetId ?? null;
  const targetFleetId = fleetId ?? userFleetId;

  return useQuery<FleetBillingContext, Error>({
    queryKey: ["fleet-billing-context", targetFleetId],
    queryFn: async () => {
      if (!targetFleetId) {
        throw new Error("Flotte requise");
      }
      return fleetBillingService.getFleetBillingContext(targetFleetId);
    },
    enabled: !!targetFleetId,
    staleTime: 60_000,
  });
}
