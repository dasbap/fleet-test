import { useQuery } from "@tanstack/react-query";
import { DriverShiftRepository } from "@/repositories/driver-shift.repository";
import { DriverShiftService } from "@/services/driver-shift.service";
import { VehicleRepository } from "@/repositories/vehicle.repository";
import { VehicleDocumentRepository } from "@/repositories/vehicle-document.repository";
import { VehicleDocumentService } from "@/services/vehicle-document.service";

const shiftRepository = new DriverShiftRepository();
const vehicleRepository = new VehicleRepository();
const shiftService = new DriverShiftService(shiftRepository, vehicleRepository);

const vehicleDocumentRepository = new VehicleDocumentRepository();
const vehicleDocumentService = new VehicleDocumentService(vehicleDocumentRepository);

export function usePendingClosures(fleetId?: string) {
  return useQuery({
    queryKey: ["fleet-pending-closures", fleetId],
    queryFn: () => shiftService.getPendingClosuresForFleet(fleetId!),
    enabled: Boolean(fleetId),
    staleTime: 30_000,
  });
}

/** Créneaux ouverts pour une flotte (supervision / statut conducteur). */
export function useFleetOpenShifts(fleetId?: string) {
  return useQuery({
    queryKey: ["fleet-open-shifts", fleetId],
    queryFn: () => shiftRepository.findOpenShiftsByFleetId(fleetId!),
    enabled: Boolean(fleetId),
    staleTime: 30_000,
  });
}

export function useExpiringVehicleDocuments(fleetId?: string, daysAhead = 30) {
  return useQuery({
    queryKey: ["fleet-expiring-vehicle-documents", fleetId, daysAhead],
    queryFn: () => vehicleDocumentService.getExpiringDocuments(fleetId!, daysAhead),
    enabled: Boolean(fleetId),
    staleTime: 60_000,
  });
}
