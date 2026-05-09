import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { OperationsService } from "@/services/operations.service";
import { OperationsRepository } from "@/repositories/operations.repository";

const operationsRepository = new OperationsRepository();
const operationsService = new OperationsService(operationsRepository);

/** Clés React Query pour invalider le cache après branchement API. */
export const operationsQueryKeys = {
  all: ["operations"] as const,
  organizer: (fleetId: string) => [...operationsQueryKeys.all, "organizer", fleetId] as const,
  manager: (fleetId: string) => [...operationsQueryKeys.all, "manager", fleetId] as const,
  driver: (userId: string) => [...operationsQueryKeys.all, "driver", userId] as const,
  mechanic: (fleetId: string) => [...operationsQueryKeys.all, "mechanic", fleetId] as const,
};

export function useOrganizerOperations() {
  const { userFleetId } = useAuth();
  return useQuery({
    queryKey: operationsQueryKeys.organizer(userFleetId ?? ""),
    queryFn: () => operationsService.getOrganizerOperations(userFleetId),
    enabled: !!userFleetId,
  });
}

export function useManagerOperations() {
  const { userFleetId } = useAuth();
  return useQuery({
    queryKey: operationsQueryKeys.manager(userFleetId ?? ""),
    queryFn: () => operationsService.getManagerOperations(userFleetId),
    enabled: !!userFleetId,
  });
}

export function useDriverOperations() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  return useQuery({
    queryKey: operationsQueryKeys.driver(userId ?? ""),
    queryFn: () => operationsService.getDriverOperations(userId),
    enabled: !!userId,
  });
}

export function useMechanicOperations() {
  const { userFleetId } = useAuth();
  return useQuery({
    queryKey: operationsQueryKeys.mechanic(userFleetId ?? ""),
    queryFn: () => operationsService.getMechanicOperations(userFleetId),
    enabled: !!userFleetId,
  });
}
