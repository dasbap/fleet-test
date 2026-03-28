import type { FleetVehicleDetail } from "@/types/fleet-vehicle";
import { MOCK_DEMO_VEHICLES } from "@/mocks/demo/vehicles";

/** Données de démonstration — remplacer par service + API plus tard. */
export const MOCK_FLEET_USE_DEMO_DATA = true;

export const MOCK_FLEET_VEHICLES: FleetVehicleDetail[] = MOCK_DEMO_VEHICLES;

export function getMockFleetVehicleById(
  id: string | undefined
): FleetVehicleDetail | undefined {
  if (!id) return undefined;
  return MOCK_FLEET_VEHICLES.find((v) => v.id === id);
}
