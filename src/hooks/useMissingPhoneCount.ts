import { useMemo } from "react";
import { useFleetDriverActivationHealth } from "@/hooks/useFleetDriverActivationHealth";

/**
 * Nombre de chauffeurs actifs sans numéro de téléphone renseigné (RPC `fleet_driver_activation_health`).
 */
export function useMissingPhoneCount(fleetId: string | null | undefined) {
  const { data, isLoading } = useFleetDriverActivationHealth(fleetId ?? undefined);
  const missingCount = useMemo(() => {
    if (!data || data.total_drivers === 0) return 0;
    return Math.max(0, data.total_drivers - data.with_phone_count);
  }, [data]);
  return { missingCount, isLoading };
}
