import { describe, expect, it } from "vitest";
import { countMaintenanceDueThisWeek } from "@/lib/mobileHomeKpi";
import type { MaintenanceJob } from "@/hooks/useMaintenance";

describe("countMaintenanceDueThisWeek", () => {
  const monday = new Date("2026-03-23T12:00:00.000Z"); // lundi

  it("compte les jobs non terminés dont planned_at est dans la semaine", () => {
    const jobs: MaintenanceJob[] = [
      {
        id: "1",
        vehicle_id: "v1",
        fleet_id: "f1",
        created_from_incident_id: null,
        priority: "medium",
        status: "queued",
        created_at: "2026-01-01T00:00:00.000Z",
        closed_at: null,
        planned_at: "2026-03-24T10:00:00.000Z",
      },
      {
        id: "2",
        vehicle_id: "v1",
        fleet_id: "f1",
        created_from_incident_id: null,
        priority: "medium",
        status: "ready",
        created_at: "2026-03-24T00:00:00.000Z",
        closed_at: null,
        planned_at: "2026-03-25T10:00:00.000Z",
      },
    ];
    expect(countMaintenanceDueThisWeek(jobs, monday)).toBe(1);
  });

  it("exclut les jobs terminés (ready)", () => {
    const jobs: MaintenanceJob[] = [
      {
        id: "1",
        vehicle_id: "v1",
        fleet_id: "f1",
        created_from_incident_id: null,
        priority: "medium",
        status: "ready",
        created_at: "2026-03-23T00:00:00.000Z",
        closed_at: "2026-03-23T12:00:00.000Z",
        planned_at: "2026-03-24T10:00:00.000Z",
      },
    ];
    expect(countMaintenanceDueThisWeek(jobs, monday)).toBe(0);
  });
});
