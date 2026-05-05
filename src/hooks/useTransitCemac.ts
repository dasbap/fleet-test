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
