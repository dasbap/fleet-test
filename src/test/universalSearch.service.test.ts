import { describe, expect, it, vi } from "vitest";
import {
  searchAll,
  type UniversalSearchDeps,
} from "@/services/universalSearch.service";
import { ROUTE_PATHS } from "@/navigation/routePaths";
import type { VehicleSearchResult } from "@/types/search";

function createDeps(
  overrides: Partial<UniversalSearchDeps> = {},
): UniversalSearchDeps {
  return {
    getVehicleSearchItems: vi.fn().mockResolvedValue([]),
    getMaintenanceRows: vi.fn().mockResolvedValue([]),
    getAlertRows: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

const vehicleSample: VehicleSearchResult = {
  id: "veh-1",
  fleet_id: "fleet-1",
  plate: "AB-123-CD",
  brand: "Toyota",
  model: "Hilux",
  driver_name: "Jean Dupont",
  km: 12_500,
  status: "active",
  pending_maint_type: null,
  alert_severity: null,
  alert_rank: 0,
  search_text: "",
  similarity: 1,
};

describe("searchAll", () => {
  it("retourne un tableau vide si la requête est vide ou uniquement des espaces", async () => {
    const deps = createDeps();
    await expect(searchAll("   ", { kind: "all" }, "fleet-1", deps)).resolves.toEqual([]);
    await expect(searchAll("", { kind: "all" }, "fleet-1", deps)).resolves.toEqual([]);
    expect(deps.getVehicleSearchItems).not.toHaveBeenCalled();
  });

  it("retourne un tableau vide si fleetId est absent", async () => {
    const deps = createDeps();
    await expect(
      searchAll("test", { kind: "all" }, null, deps),
    ).resolves.toEqual([]);
    expect(deps.getVehicleSearchItems).not.toHaveBeenCalled();
  });

  it("normalise la requête en minuscules pour les dépendances", async () => {
    const deps = createDeps();
    await searchAll("  HELLO  ", { kind: "vehicle" }, "fleet-x", deps);
    expect(deps.getVehicleSearchItems).toHaveBeenCalledWith("fleet-x", "hello");
  });

  it("n’interroge que les véhicules si kind = vehicle", async () => {
    const deps = createDeps({
      getVehicleSearchItems: vi.fn().mockResolvedValue([vehicleSample]),
    });
    const results = await searchAll("x", { kind: "vehicle" }, "fleet-1", deps);
    expect(deps.getVehicleSearchItems).toHaveBeenCalled();
    expect(deps.getMaintenanceRows).not.toHaveBeenCalled();
    expect(deps.getAlertRows).not.toHaveBeenCalled();
    expect(results).toHaveLength(1);
    expect(results[0].kind).toBe("vehicle");
    expect(results[0].href).toBe(ROUTE_PATHS.dashboardVehicleDetail("veh-1"));
    expect(results[0].badgeColor).toBe("green");
  });

  it("n’interroge que la maintenance si kind = maintenance", async () => {
    const deps = createDeps({
      getMaintenanceRows: vi.fn().mockResolvedValue([
        {
          id: "job-99",
          vehicle_id: "veh-uuid-long",
          status: "queued",
          planned_at: "2026-01-15T10:00:00.000Z",
          closed_at: null,
          notes: "Vidange",
          vehicle: { registration: "XY-999-ZZ" },
        },
      ]),
    });
    const results = await searchAll("vidange", { kind: "maintenance" }, "fleet-1", deps);
    expect(deps.getVehicleSearchItems).not.toHaveBeenCalled();
    expect(deps.getMaintenanceRows).toHaveBeenCalled();
    expect(deps.getAlertRows).not.toHaveBeenCalled();
    expect(results[0].kind).toBe("maintenance");
    expect(results[0].href).toBe(
      `${ROUTE_PATHS.dashboardMaintenance}?job=${encodeURIComponent("job-99")}`,
    );
    expect(results[0].badge).toBe("en cours");
  });

  it("n’interroge que les alertes si kind = alert", async () => {
    const deps = createDeps({
      getAlertRows: vi.fn().mockResolvedValue([
        {
          id: "al-1",
          vehicle_id: "v1",
          severity: "critical",
          message: "Frein",
          vehicle: { registration: "ZZ-001-AA" },
        },
      ]),
    });
    const results = await searchAll("frein", { kind: "alert" }, "fleet-1", deps);
    expect(deps.getVehicleSearchItems).not.toHaveBeenCalled();
    expect(deps.getMaintenanceRows).not.toHaveBeenCalled();
    expect(deps.getAlertRows).toHaveBeenCalled();
    expect(results[0].kind).toBe("alert");
    expect(results[0].href).toBe(ROUTE_PATHS.dashboardAlertDetail("al-1"));
    expect(results[0].badgeColor).toBe("red");
  });

  it("avec kind = all, agrège les trois sources", async () => {
    const deps = createDeps({
      getVehicleSearchItems: vi.fn().mockResolvedValue([vehicleSample]),
      getMaintenanceRows: vi.fn().mockResolvedValue([
        {
          id: "j1",
          vehicle_id: "v",
          status: "ready",
          planned_at: null,
          closed_at: "2026-02-01T12:00:00.000Z",
          notes: "ok",
          vehicle: null,
        },
      ]),
      getAlertRows: vi.fn().mockResolvedValue([
        {
          id: "a1",
          vehicle_id: null,
          severity: "low",
          message: "Info",
          vehicle: null,
        },
      ]),
    });
    const results = await searchAll("mix", { kind: "all" }, "fleet-1", deps);
    expect(deps.getVehicleSearchItems).toHaveBeenCalled();
    expect(deps.getMaintenanceRows).toHaveBeenCalled();
    expect(deps.getAlertRows).toHaveBeenCalled();
    expect(results.map((r) => r.kind)).toEqual(["vehicle", "maintenance", "alert"]);
    expect(results[1].badge).toBe("terminé");
    expect(results[2].badgeColor).toBe("green");
  });
});
