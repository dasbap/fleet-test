import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import {
  DvirRepository,
  type DvirInsert,
  type DvirEntry,
} from "@/repositories/dvir.repository";

export type { DvirEntry };
export type { InspectionType, OverallStatus } from "@/repositories/dvir.repository";

const repo = new DvirRepository();

export function useDvirRecent(limit = 30) {
  const { userFleetId } = useAuth();

  return useQuery({
    queryKey: ["dvir-recent", userFleetId, limit],
    queryFn: () =>
      userFleetId ? repo.findRecentByFleet(userFleetId, limit) : [],
    enabled: !!userFleetId,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });
}

export function useDvirById(id: string | undefined) {
  return useQuery({
    queryKey: ["dvir-by-id", id],
    queryFn: () => (id ? repo.findById(id) : null),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useCreateDvir() {
  const queryClient = useQueryClient();
  const { user, userFleetId } = useAuth();

  return useMutation({
    mutationFn: async (
      input: Omit<DvirInsert, "fleet_id" | "inspected_by">,
    ): Promise<DvirEntry> => {
      if (!user) throw new Error("Utilisateur non connecté");
      if (!userFleetId) throw new Error("Aucune flotte active");

      return repo.create({
        ...input,
        fleet_id: userFleetId,
        inspected_by: user.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dvir-recent"] });
      toast({
        title: "Contrôle enregistré",
        description: "Le contrôle journalier a été transmis.",
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Erreur",
        description: err.message,
        variant: "destructive",
      });
    },
  });
}
