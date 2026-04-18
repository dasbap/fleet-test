import { describe, expect, it } from "vitest";
import { buildVehicleHistoryEvents } from "@/features/fleet/lib/vehicleHistory";
import {
  buildVehicleDetailStats,
  countCriticalAlerts,
  daysUntil,
  getJobScheduledIso,
  isMaintenanceJobDone,
  pickNextPendingMaintenance,
  sortJobsForTimeline,
  timelineSeverityForJob,
} from "@/features/fleet/lib/vehicleHistory";
import type { VehicleDto } from "@/types/dto/vehicle.dto";
import type { AlertDto } from "@/types/dto/alert.dto";
import type { MaintenanceJob } from "@/repositories/maintenance.repository";

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

function baseMaintenanceJob(overrides: Partial<MaintenanceJob> = {}): MaintenanceJob {
  return {
    id: "j1",
    vehicle_id: "v1",
    fleet_id: "f1",
    created_from_incident_id: null,
    priority: "medium",
    status: "queued",
    created_at: "2025-01-01T12:00:00.000Z",
    closed_at: null,
    notes: null,
    planned_at: null,
    ...overrides,
  };
}

describe("vehicleDetailViewModel", () => {
  it("isMaintenanceJobDone est vrai uniquement pour status ready", () => {
    expect(isMaintenanceJobDone(baseMaintenanceJob({ status: "ready" }))).toBe(true);
    expect(isMaintenanceJobDone(baseMaintenanceJob({ status: "queued" }))).toBe(false);
  });

  it("getJobScheduledIso utilise planned_at si present", () => {
    expect(
      getJobScheduledIso(
        baseMaintenanceJob({
          planned_at: "2025-06-01T10:00:00.000Z",
          created_at: "2025-01-01T12:00:00.000Z",
        })
      )
    ).toBe("2025-06-01T10:00:00.000Z");
  });

  it("daysUntil calcule le decalage en jours", () => {
    const now = new Date("2025-01-10T12:00:00.000Z").getTime();
    expect(daysUntil("2025-01-12T12:00:00.000Z", now)).toBe(2);
  });

  it("countCriticalAlerts filtre severity critical", () => {
    const alerts = [
      { severity: "critical" },
      { severity: "high" },
      { severity: "critical" },
    ] as AlertDto[];
    expect(countCriticalAlerts(alerts)).toBe(2);
  });

  it("buildVehicleDetailStats agrege les compteurs", () => {
    const jobs = [
      baseMaintenanceJob({ id: "a", status: "ready" }),
      baseMaintenanceJob({ id: "b", status: "queued" }),
      baseMaintenanceJob({ id: "c", status: "in_progress" }),
    ];
    const alerts = [{ severity: "critical" }, { severity: "low" }] as AlertDto[];
    const stats = buildVehicleDetailStats(jobs, alerts);
    expect(stats.completedCount).toBe(1);
    expect(stats.pendingCount).toBe(2);
    expect(stats.criticalAlerts).toBe(1);
    expect(stats.totalCostXaf12m).toBe(0);
  });

  it("pickNextPendingMaintenance choisit l'echeance la plus proche", () => {
    const jobs = [
      baseMaintenanceJob({ id: "later", status: "queued", planned_at: "2025-12-01T00:00:00.000Z" }),
      baseMaintenanceJob({ id: "sooner", status: "queued", planned_at: "2025-03-01T00:00:00.000Z" }),
      baseMaintenanceJob({ id: "done", status: "ready", planned_at: "2025-01-01T00:00:00.000Z" }),
    ];
    expect(pickNextPendingMaintenance(jobs)?.id).toBe("sooner");
  });

  it("sortJobsForTimeline trie par date decroissante", () => {
    const jobs = [
      baseMaintenanceJob({
        id: "old",
        status: "ready",
        closed_at: "2024-01-01T00:00:00.000Z",
        created_at: "2023-01-01T00:00:00.000Z",
      }),
      baseMaintenanceJob({
        id: "new",
        status: "ready",
        closed_at: "2025-01-01T00:00:00.000Z",
        created_at: "2024-01-01T00:00:00.000Z",
      }),
    ];
    expect(sortJobsForTimeline(jobs).map((j) => j.id)).toEqual(["new", "old"]);
  });

  it("timelineSeverityForJob retourne info pour travail termine", () => {
    const job = baseMaintenanceJob({ status: "ready", closed_at: "2025-01-01T00:00:00.000Z" });
    expect(timelineSeverityForJob(job, Date.now())).toBe("info");
  });

  it("timelineSeverityForJob monte en criticite si retard long", () => {
    const now = new Date("2025-06-15T12:00:00.000Z").getTime();
    const job = baseMaintenanceJob({
      status: "queued",
      planned_at: "2025-04-01T12:00:00.000Z",
      priority: "medium",
    });
    expect(timelineSeverityForJob(job, now)).toBe("critical");
  });
});
