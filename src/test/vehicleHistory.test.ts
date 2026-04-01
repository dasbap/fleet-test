import { describe, expect, it } from "vitest";
import { buildVehicleHistoryEvents } from "@/features/fleet/lib/vehicleHistory";
import type { VehicleDto } from "@/types/dto/vehicle.dto";
import type { AlertDto } from "@/types/dto/alert.dto";

describe("buildVehicleHistoryEvents", () => {
  it("compose un historique trié du plus récent au plus ancien", () => {
    const vehicle: VehicleDto = {
      id: "veh-1",
      fleet_id: "fleet-1",
      registration: "AB-123-CD",
      brand: "Toyota",
      model: "Hilux",
      year: 2020,
      current_km: 50000,
      status: "ok",
      blocked_reason: null,
      created_at: "2026-03-01T10:00:00.000Z",
    };

    const alerts: AlertDto[] = [
      {
        id: "al-1",
        fleet_id: "fleet-1",
        alert_type: "vehicle_blocked",
        driver_user_id: null,
        vehicle_id: "veh-1",
        shift_id: null,
        severity: "high",
        message: "Alerte récente",
        resolved: false,
        resolved_by: null,
        resolved_at: null,
        created_at: "2026-03-10T08:00:00.000Z",
      },
    ];

    const events = buildVehicleHistoryEvents(vehicle, alerts);

    expect(events[0].id).toBe("alert-al-1");
    expect(events[1].id).toBe("vehicle-created-veh-1");
  });
});

