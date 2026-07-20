import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { FleetTrackingRepository } from "@/repositories/fleet-tracking.repository";
import { FleetTrackingService } from "@/services/fleet-tracking.service";

const fleetTrackingRepository = new FleetTrackingRepository();
const fleetTrackingService = new FleetTrackingService(fleetTrackingRepository);

export function useVehiclePositionsLive(fleetId?: string) {
  const { userFleetId } = useAuth();
  const targetFleetId = fleetId ?? userFleetId;

  return useQuery({
    queryKey: ["vehicle-positions-live", targetFleetId],
    queryFn: () => fleetTrackingService.getLatestPositionsByFleet(targetFleetId),
    enabled: !!targetFleetId,
    refetchInterval: 15_000,
    staleTime: 10_000,
  });
}

export function useGeofences(fleetId?: string) {
  const { userFleetId } = useAuth();
  const targetFleetId = fleetId ?? userFleetId;

  return useQuery({
    queryKey: ["geofences", targetFleetId],
    queryFn: () => fleetTrackingService.getGeofencesByFleet(targetFleetId),
    enabled: !!targetFleetId,
    staleTime: 60_000,
  });
}

export function useRecentGeofenceEvents(limit = 30, fleetId?: string) {
  const { userFleetId } = useAuth();
  const targetFleetId = fleetId ?? userFleetId;

  return useQuery({
    queryKey: ["geofence-events", targetFleetId, limit],
    queryFn: () => fleetTrackingService.getRecentGeofenceEventsByFleet(targetFleetId, limit),
    enabled: !!targetFleetId,
    refetchInterval: 20_000,
    staleTime: 15_000,
  });
}

export function useGpsDevices(fleetId?: string) {
  const { userFleetId } = useAuth();
  const targetFleetId = fleetId ?? userFleetId;

  return useQuery({
    queryKey: ["gps-devices", targetFleetId],
    queryFn: () => fleetTrackingService.getGpsDevicesByFleet(targetFleetId),
    enabled: !!targetFleetId,
    staleTime: 60_000,
  });
}
