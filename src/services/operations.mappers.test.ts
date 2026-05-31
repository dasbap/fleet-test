import { describe, it, expect } from "vitest";
import {
  buildOrganizerTasks,
  maintenanceJobToIntervention,
  shiftToMissionCard,
  plannedShiftToMissionCard,
} from "@/services/operations.mappers";
import type { DriverShift } from "@/repositories/driver-shift.repository";
import type { PlannedShift } from "@/repositories/planned-shift.repository";
import type { MaintenanceJob } from "@/repositories/maintenance.repository";

describe("operations.mappers", () => {
  it("shiftToMissionCard produit une carte cohérente", () => {
    const shift = {
      id: "s1",
      assignment_id: "a1",
      km_start: 12000,
      km_end: null,
      started_at: "2026-03-28T06:00:00.000Z",
      ended_at: null,
      status: "open",
      assignment: {
        id: "a1",
        fleet_id: "f1",
        vehicle_id: "v1",
        driver_user_id: "d1",
        vehicle: {
          id: "v1",
          registration: "AB-001-CD",
          brand: "Iveco",
          model: "Daily",
        },
        driver: { user_id: "d1", full_name: "Jean Dupont" },
      },
    } as DriverShift;

    const card = shiftToMissionCard(shift);
    expect(card.id).toBe("s1");
    expect(card.title).toContain("AB-001-CD");
    expect(card.status).toBe("in_progress");
    expect(card.vehicleLabel).toContain("Iveco");
  });

  it("plannedShiftToMissionCard produit une carte planifiée", () => {
    const planned = {
      id: "p1",
      fleet_id: "f1",
      driver_user_id: "d1",
      vehicle_id: "v1",
      planned_start: "2026-05-31T08:00:00.000Z",
      planned_end: "2026-05-31T12:00:00.000Z",
      status: "confirmed",
      creneau_id: null,
      notes: "Tournée matin",
      created_by: "mgr-1",
      created_at: "2026-05-30T10:00:00.000Z",
      vehicle: {
        id: "v1",
        registration: "LT-1234-A",
        brand: "Toyota",
        model: "Hiace",
      },
    } as PlannedShift;

    const card = plannedShiftToMissionCard(planned, "Paul N.");
    expect(card.title).toContain("LT-1234-A");
    expect(card.status).toBe("planned");
    expect(card.driverName).toBe("Paul N.");
  });

  it("maintenanceJobToIntervention mappe le statut ready vers completed et canClose", () => {
    const job = {
      id: "j1",
      vehicle_id: "v1",
      fleet_id: "f1",
      created_from_incident_id: null,
      priority: "medium",
      status: "ready",
      created_at: "2026-03-28T10:00:00.000Z",
      closed_at: null,
      notes: "RAS",
      vehicle: { id: "v1", registration: "XY-999-ZZ", brand: "Peugeot", model: "Boxer" },
    } as MaintenanceJob;

    const inv = maintenanceJobToIntervention(job);
    expect(inv.status).toBe("completed");
    expect(inv.canClose).toBe(true);
    expect(inv.diagnostic).toBe("RAS");
  });

  it("buildOrganizerTasks ajoute une tâche « parc sous contrôle » si tout est vide", () => {
    const tasks = buildOrganizerTasks({
      pendingClosureCount: 0,
      queuedMaintenanceCount: 0,
      recentIncidentCount: 0,
    });
    expect(tasks).toHaveLength(1);
    expect(tasks[0].id).toBe("task-ok");
    expect(tasks[0].status).toBe("completed");
  });

  it("buildOrganizerTasks pointe les clôtures vers la section validation", () => {
    const tasks = buildOrganizerTasks({
      pendingClosureCount: 2,
      queuedMaintenanceCount: 0,
      recentIncidentCount: 0,
    });
    expect(tasks[0].href).toBe("/dashboard/operations#clotures-en-attente");
  });
});
