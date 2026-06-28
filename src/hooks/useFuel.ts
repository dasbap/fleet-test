import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { OfflineQueueService } from "@/services/offlineQueue.service";
import { FuelRepository } from "@/repositories/fuel.repository";
import { FuelService, type FuelEntryInput } from "@/services/fuel.service";
import { isOfflineMode } from "@/lib/network/networkStatus";

const offlineQueueService = new OfflineQueueService();
const fuelRepository = new FuelRepository();
const fuelService = new FuelService(fuelRepository);

export function useFuelLogsByVehicle(vehicleId: string | undefined) {
  const { userFleetId } = useAuth();
  return useQuery({
    queryKey: ["fuel-entries", "vehicle", vehicleId, userFleetId],
    enabled: !!vehicleId && !!userFleetId,
    networkMode: "offlineFirst",
    queryFn: async () => {
      if (!vehicleId || !userFleetId) return [];
      return fuelRepository.findByVehicle(userFleetId, vehicleId);
    },
  });
}

export function useCreateFuelEntry() {
  const queryClient = useQueryClient();
  const { user, userFleetId } = useAuth();

  return useMutation({
    mutationFn: async (input: Omit<FuelEntryInput, "fleetId" | "driverUserId">) => {
      if (!user) throw new Error("Utilisateur non connecté");
      if (!userFleetId) throw new Error("Aucune flotte active");

      const payload = fuelService.buildOfflinePayload({
        ...input,
        fleetId: userFleetId,
        driverUserId: user.id,
      });

      if (isOfflineMode()) {
        await offlineQueueService.enqueueFuelCreate(payload);
        return { kind: "queued" as const };
      }

      await fuelService.createWithIdempotency(
        {
          ...input,
          fleetId: userFleetId,
          driverUserId: user.id,
        },
        crypto.randomUUID(),
      );
      return { kind: "created" as const };
    },
    onSuccess: async (result) => {
      if (result.kind === "queued") {
        toast({
          title: "Saisie hors ligne",
          description: "Le plein carburant est enregistré localement et sera synchronisé.",
        });
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ["fuel-entries"] });
      await queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      toast({
        title: "Carburant enregistré",
        description: "La saisie carburant a été transmise.",
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
