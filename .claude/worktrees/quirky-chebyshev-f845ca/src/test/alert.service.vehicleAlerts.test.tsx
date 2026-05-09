import { describe, expect, it } from "vitest";
import type { AlertDto } from "@/types/dto/alert.dto";
import { AlertService } from "@/services/alert.service";

class FakeAlertRepository {
  private rows: AlertDto[];

  constructor(rows: AlertDto[]) {
    this.rows = rows;
  }

  // Méthode utilisée par AlertService pour ce test
  findUnresolvedByVehicle(vehicleId: string, fleetId?: string): Promise<AlertDto[]> {
    const filtered = this.rows.filter((row) => {
      if (row.vehicle_id !== vehicleId) return false;
      if (row.resolved) return false;
      if (fleetId && row.fleet_id !== fleetId) return false;
      return true;
    });
    return Promise.resolve(filtered);
  }
}

describe("AlertService.getVehicleAlertsForFleet", () => {
  const baseAlert: AlertDto = {
    id: "a1",
    fleet_id: "f1",
    alert_type: "vehicle_blocked",
    driver_user_id: null,
    vehicle_id: "v1",
    shift_id: null,
    severity: "high",
    message: "Véhicule bloqué",
    resolved: false,
    resolved_by: null,
    resolved_at: null,
    created_at: new Date().toISOString(),
  };

  it("retourne les alertes non résolues pour le véhicule et la flotte donnés", async () => {
    const repo = new FakeAlertRepository([
      baseAlert,
      { ...baseAlert, id: "a2", resolved: true },
      { ...baseAlert, id: "a3", fleet_id: "f2" },
      { ...baseAlert, id: "a4", vehicle_id: "v2" },
    ]);
    // @ts-expect-error fake repo interne au test
    const service = new AlertService(repo);

    const result = await service.getVehicleAlertsForFleet("v1", "f1");

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("a1");
  });

  it("retourne un tableau vide si vehicleId ou fleetId est manquant", async () => {
    const repo = new FakeAlertRepository([baseAlert]);
    // @ts-expect-error fake repo interne au test
    const service = new AlertService(repo);

    await expect(service.getVehicleAlertsForFleet("", "f1")).resolves.toEqual([]);
    await expect(service.getVehicleAlertsForFleet("v1", null)).resolves.toEqual([]);
  });
});

