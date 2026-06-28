import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { DvirRepository, type DvirStatus } from "@/repositories/dvir.repository";
import { DvirService, type DvirCreateInput, type DvirUpdateInput } from "@/services/dvir.service";
import { isOfflineMode } from "@/lib/network/networkStatus";
import { compressImageFile } from "@/services/image-compression.service";
import { savePendingOfflineMedia } from "@/services/offline-media-storage.service";
import { OfflineQueueService } from "@/services/offlineQueue.service";

const offlineQueueService = new OfflineQueueService();

const dvirRepository = new DvirRepository();
const dvirService = new DvirService(dvirRepository);

export type { DvirStatus };
export type { DvirDetail, DvirListItem, DvirChecklistConfigItem } from "@/repositories/dvir.repository";
export type { DvirCreateInput, DvirUpdateInput } from "@/services/dvir.service";

// Alias pour compatibilité avec DvirPage.tsx
export type DvirEntry = import("@/repositories/dvir.repository").DvirListItem;

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
    queryFn: () =>
      dvirService.list({
        fleetId: userFleetId!,
        vehicleId: filters.vehicleId,
        inspectedBy: filters.inspectedBy,
        status: filters.status,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        limit: filters.limit ?? 50,
        offset: filters.offset ?? 0,
      }),
    enabled: !!userFleetId,
    staleTime: 60_000,
    retry: false,
  });
}

/** Alias pratique : retourne les N dernières inspections de la flotte */
export function useDvirRecent(limit = 20) {
  return useDvirList({ limit });
}

export function useDvirChecklistConfig() {
  return useQuery({
    queryKey: ["dvir-checklist-config"],
    queryFn: () => dvirService.getChecklistConfig(),
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export function useDvirById(id?: string) {
  return useQuery({
    queryKey: ["dvir-by-id", id],
    queryFn: () => dvirService.getById(id!),
    enabled: !!id,
    retry: false,
  });
}

export function useCreateDvir() {
  const { user, userFleetId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: Omit<DvirCreateInput, "fleetId" | "inspectedBy"> & {
        /** Fichiers photos sélectionnés sur l'appareil (max 5) */
        photoFiles?: File[];
      },
    ): Promise<{ kind: "created" | "queued" }> => {
      if (!user) throw new Error("Utilisateur non connecté");
      if (!userFleetId) throw new Error("Aucune flotte active");

      const { photoFiles = [], ...dvirInput } = input;
      const isOffline = isOfflineMode();

      if (isOffline) {
        const photoMediaRefs = await Promise.all(
          photoFiles.slice(0, 5).map(async (file) => {
            const compressed = await compressImageFile(file);
            return savePendingOfflineMedia(compressed.dataUrl, compressed.mimeType, compressed.sizeBytes);
          }),
        );
        await offlineQueueService.enqueueDvirCreate({
          fleetId: userFleetId,
          vehicleId: dvirInput.vehicleId,
          inspectedBy: user.id,
          inspectionType: dvirInput.inspectionType,
          items: dvirInput.items,
          notes: dvirInput.notes ?? null,
          odometerKm: dvirInput.odometerKm ?? null,
          photoMediaRefs,
        });
        return { kind: "queued" };
      }

      // Upload photos en ligne
      const photoUrls: string[] = [];
      for (const file of photoFiles.slice(0, 5)) {
        try {
          const url = await dvirService.uploadPhoto(userFleetId, dvirInput.vehicleId, file);
          photoUrls.push(url);
        } catch {
          // Photo non bloquante : on continue sans elle
        }
      }

      await dvirService.create(
        {
          ...dvirInput,
          fleetId: userFleetId,
          inspectedBy: user.id,
        },
        photoUrls,
      );
      return { kind: "created" };
    },
    onSuccess: async (result) => {
      if (result.kind === "queued") {
        toast({
          title: "Inspection en attente",
          description: "Le DVIR est enregistré localement et sera synchronisé dès le retour du réseau.",
        });
        return;
      }
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

export function useUpdateDvir() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DvirUpdateInput) => dvirService.update(input),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["dvir-list"] });
      await queryClient.invalidateQueries({ queryKey: ["dvir-by-id", variables.id] });
      toast({
        title: "Inspection mise à jour",
        description: "Le rapport DVIR a été enregistré.",
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
