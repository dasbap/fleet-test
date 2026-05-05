import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { FuelRepository, type FuelEntry } from "@/repositories/fuel.repository";

const repo = new FuelRepository();

export type { FuelEntry };

export interface FuelSummary {
  totalLiters: number;
  totalAmountXof: number;
  avgCostPerLiter: number;
  entryCount: number;
}

export function useFuelLogs(limit = 50) {
  const { userFleetId } = useAuth();

  return useQuery({
    queryKey: ["fuel-entries", userFleetId, limit],
    queryFn: () =>
      userFleetId ? repo.findByFleet(userFleetId, { limit }) : [],
    enabled: !!userFleetId,
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
}

export function useFuelSummary(): FuelSummary & { isLoading: boolean } {
  const { data, isLoading } = useFuelLogs(200);
  const entries = data ?? [];

  const totalLiters = entries.reduce((s, e) => s + e.liters, 0);
  const totalAmountXof = entries.reduce((s, e) => s + e.amount_xof, 0);
  const avgCostPerLiter = totalLiters > 0 ? totalAmountXof / totalLiters : 0;

  return {
    totalLiters,
    totalAmountXof,
    avgCostPerLiter,
    entryCount: entries.length,
    isLoading,
  };
}
