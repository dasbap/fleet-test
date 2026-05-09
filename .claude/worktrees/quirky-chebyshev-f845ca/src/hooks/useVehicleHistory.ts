import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { AlertRepository } from "@/repositories/alert.repository";
import { IncidentRepository } from "@/repositories/incident.repository";
import { MaintenanceRepository } from "@/repositories/maintenance.repository";
import { VehicleRepository } from "@/repositories/vehicle.repository";
import { VehicleHistoryRepository } from "@/repositories/vehicle_history.repository";
import { VehicleHistoryService } from "@/services/vehicle_history.service";
import {
  getCachedVehicleHistory,
  saveVehicleHistoryCache,
} from "@/lib/storage/flotteEsambaLocalCache";

const vehicleRepository = new VehicleRepository();
const alertRepository = new AlertRepository();
const incidentRepository = new IncidentRepository();
const maintenanceRepository = new MaintenanceRepository();
const vehicleHistoryRepository = new VehicleHistoryRepository(
  vehicleRepository,
  alertRepository,
  incidentRepository,
  maintenanceRepository
);
const vehicleHistoryService = new VehicleHistoryService(vehicleHistoryRepository);

export function useVehicleHistory(vehicleId: string | undefined) {
  const { userFleetId } = useAuth();

  return useQuery({
    queryKey: ["vehicle-history", vehicleId, userFleetId],
    enabled: !!vehicleId && !!userFleetId,
    queryFn: async () => {
      if (!vehicleId || !userFleetId) return null;
      const data = await vehicleHistoryService.getVehicleHistory(vehicleId, userFleetId);
      if (data) {
        saveVehicleHistoryCache({
          vehicleId: data.vehicleId,
          fleetId: data.fleetId,
          events: data.events,
        });
      }
      return data;
    },
    placeholderData: () => {
      if (!vehicleId) return null;
      const cached = getCachedVehicleHistory(vehicleId);
      if (!cached) return null;
      return {
        vehicleId: cached.vehicleId,
        fleetId: cached.fleetId,
        events: cached.events,
      };
    },
  });
}

