import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import {
  transitCemacRepository,
  type TransitCemac,
  type TransitCemacFilters,
  type TransitCemacInsert,
} from "@/repositories/transit-cemac.repository";

const QK = "transits-cemac";

export function useTransitCemac(filters: TransitCemacFilters = {}) {
  const { userFleetId } = useAuth();

  return useQuery({
    queryKey: [QK, userFleetId, filters],
    queryFn: () => transitCemacRepository.findByFleet(userFleetId!, filters),
    enabled: !!userFleetId,
    staleTime: 30_000,
  });
}

export function useActiveTransits() {
  const { userFleetId } = useAuth();

  return useQuery({
    queryKey: [QK, "active", userFleetId],
    queryFn: () => transitCemacRepository.findActive(userFleetId!),
    enabled: !!userFleetId,
    staleTime: 30_000,
  });
}

export function useCreateTransit() {
  const { userFleetId, user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: Omit<TransitCemacInsert, "fleet_id" | "created_by">,
    ) => {
      if (!userFleetId) throw new Error("Flotte introuvable");
      return transitCemacRepository.create({
        ...input,
        fleet_id: userFleetId,
        created_by: user?.id ?? null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QK] });
      toast({ title: "Transit enregistré" });
    },
    onError: (err: Error) => {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    },
  });
}

/** Calcule les taxes CEMAC via RPC avant création du transit */
export function useCemacTaxCalculator() {
  return useMutation({
    mutationFn: async (params: {
      corridor: string;
      countryFrom: string;
      countryTo: string;
      cargoWeightKg?: number;
      goodsValueXaf?: number;
    }) => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase.rpc("calculate_cemac_taxes", {
        p_corridor:        params.corridor,
        p_country_from:    params.countryFrom,
        p_country_to:      params.countryTo,
        p_cargo_weight_kg: params.cargoWeightKg ?? 0,
        p_goods_value_xaf: params.goodsValueXaf ?? 0,
      });
      if (error) throw new Error(error.message);
      return data as { corridor: string; total_xaf: number; breakdown: { name: string; amount: number }[] };
    },
  });
}

export function useUpdateTransitStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      status,
      arrivalDate,
    }: {
      id: string;
      status: TransitCemac["status"];
      arrivalDate?: string;
    }) => transitCemacRepository.updateStatus(id, status, arrivalDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QK] });
      toast({ title: "Statut mis à jour" });
    },
    onError: (err: Error) => {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    },
  });
}
