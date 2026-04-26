import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { DvirRepository, type DvirStatus } from "@/repositories/dvir.repository";
import { DvirService, type DvirCreateInput } from "@/services/dvir.service";

const dvirRepository = new DvirRepository();
const dvirService = new DvirService(dvirRepository);

export type { DvirStatus };
export type { DvirListItem, DvirChecklistConfigItem } from "@/repositories/dvir.repository";
export type { DvirCreateInput } from "@/services/dvir.service";

export interface UseDvirListFilters {
  vehicleId?: string;
  inspectedBy?: string;
  status?: DvirStatus;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export function useDvirList(filters: UseDvirListFilters = {}) {
  const { userFleetId } = useAuth();

  return useQuery({
    queryKey: ["dvir-list", userFleetId, filters],
    queryFn: async () => {
      if (!userFleetId) {
        return [];
      }

      return dvirService.list({
        fleetId: userFleetId,
        vehicleId: filters.vehicleId,
        inspectedBy: filters.inspectedBy,
        status: filters.status,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        limit: filters.limit ?? 50,
        offset: filters.offset ?? 0,
      });
    },
    enabled: !!userFleetId,
    staleTime: 60_000,
  });
}

export function useDvirChecklistConfig() {
  return useQuery({
    queryKey: ["dvir-checklist-config"],
    queryFn: () => dvirService.getChecklistConfig(),
    staleTime: 5 * 60_000,
  });
}

export function useDvirById(id?: string) {
  return useQuery({
    queryKey: ["dvir-by-id", id],
    queryFn: () => dvirService.getById(id!),
    enabled: !!id,
  });
}

export function useCreateDvir() {
  const { user, userFleetId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: Omit<DvirCreateInput, "fleetId" | "inspectedBy">,
    ): Promise<void> => {
      if (!user) throw new Error("Utilisateur non connecté");
      if (!userFleetId) throw new Error("Aucune flotte active");

      await dvirService.create({
        ...input,
        fleetId: userFleetId,
        inspectedBy: user.id,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["dvir-list"] });
      toast({
        title: "Inspection enregistrée",
        description: "Le rapport DVIR a été créé avec succès.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
