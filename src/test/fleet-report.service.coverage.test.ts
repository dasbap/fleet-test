import { describe, expect, it, vi } from "vitest";
import { FleetReportService } from "@/services/fleet-report.service";
import type { FleetReportRawRow } from "@/repositories/fleet-report.repository";

describe("FleetReportService", () => {
  const startDate = new Date("2026-01-01T00:00:00.000Z");
  const endDate = new Date("2026-01-31T23:59:59.000Z");

  it("rejette un identifiant de flotte vide", async () => {
    const repository = { getReportRaw: vi.fn() };
    const service = new FleetReportService(repository as never);

    await expect(service.getReport("", startDate, endDate)).rejects.toThrow("L'ID de la flotte est requis");
    expect(repository.getReportRaw).not.toHaveBeenCalled();
  });

  it("agrège les revenus, kilomètres, incidents, maintenance et chauffeurs", async () => {
    const raw: FleetReportRawRow = {
      fleet: { name: "Fleet Alpha" },
      vehicles: [
        { id: "v1", registration: "AA-001", status: "ok", current_km: 1000 },
        { id: "v2", registration: "BB-002", status: "blocked", current_km: 2000 },
        { id: "v3", registration: "CC-003", status: "maintenance", current_km: 3000 },
      ],
      closures: [
        {
          id: "c1",
          revenue_declared: 100,
          status: "validated",
          created_at: "2026-01-05T10:00:00.000Z",
          shift: {
            id: "s1",
            km_start: 10,
            km_end: 60,
            assignment: {
              vehicle: { registration: "AA-001" },
              driver: { full_name: "Alice" },
            },
          },
        },
        {
          id: "c2",
          revenue_declared: 250,
          status: "pending",
          created_at: "2026-01-06T10:00:00.000Z",
          shift: {
            id: "s2",
            km_start: 100,
            km_end: 175,
            assignment: {
              vehicle: { registration: "BB-002" },
              driver: { full_name: "Bob" },
            },
          },
        },
        {
          id: "c3",
          revenue_declared: 150,
          status: "validated",
          created_at: "2026-01-07T10:00:00.000Z",
          shift: {
            id: "s3",
            km_start: 175,
            km_end: 225,
            assignment: {
              vehicle: { registration: "BB-002" },
              driver: { full_name: "Bob" },
            },
          },
        },
        {
          id: "c4",
          revenue_declared: 0,
          status: "cancelled",
          created_at: "2026-01-08T10:00:00.000Z",
          shift: { id: "s4", km_start: 50, km_end: null },
        },
      ],
      incidents: [
        { id: "i1", description: "low", severity: "low", created_at: "2026-01-10T00:00:00.000Z", vehicle: { registration: "AA-001" } },
        { id: "i2", description: "medium", severity: "medium", created_at: "2026-01-11T00:00:00.000Z" },
        { id: "i3", description: "high", severity: "high", created_at: "2026-01-12T00:00:00.000Z" },
        { id: "i4", description: "critical", severity: "critical", created_at: "2026-01-13T00:00:00.000Z" },
      ],
      maintenance: [
        { id: "m1", status: "ready", created_at: "2026-01-01T00:00:00.000Z" },
        { id: "m2", status: "in_progress", created_at: "2026-01-02T00:00:00.000Z" },
        { id: "m3", status: "queued", created_at: "2026-01-03T00:00:00.000Z" },
      ],
      members: [
        { user_id: "u1", role: "driver", is_active: true },
        { user_id: "u2", role: "driver", is_active: false },
      ],
      scores: [
        { driver_user_id: "u1", score_level: "green", financial_score: 90, driver: { user_id: "u1", full_name: "Alice" } },
        { driver_user_id: "u2", score_level: "red", financial_score: 25, driver: { user_id: "u2", full_name: null } },
      ],
    };
    const repository = { getReportRaw: vi.fn().mockResolvedValue(raw) };
    const service = new FleetReportService(repository as never);

    const report = await service.getReport("fleet-1", startDate, endDate);

    expect(repository.getReportRaw).toHaveBeenCalledWith("fleet-1", startDate.toISOString(), endDate.toISOString());
    expect(report.period).toEqual({ start: startDate, end: endDate });
    expect(report.fleet).toEqual({ name: "Fleet Alpha", totalVehicles: 3, activeVehicles: 1, blockedVehicles: 1 });
    expect(report.revenue).toEqual({
      total: 500,
      validated: 250,
      pending: 250,
      byVehicle: [
        { registration: "BB-002", amount: 400 },
        { registration: "AA-001", amount: 100 },
      ],
    });
    expect(report.kilometers).toEqual({
      total: 175,
      average: 44,
      byVehicle: [
        { registration: "BB-002", km: 125 },
        { registration: "AA-001", km: 50 },
      ],
    });
    expect(report.incidents.total).toBe(4);
    expect(report.incidents.bySeverity).toEqual({ low: 1, medium: 1, high: 1, critical: 1 });
    expect(report.incidents.recent[0]).toEqual({
      date: new Date("2026-01-10T00:00:00.000Z"),
      vehicle: "AA-001",
      description: "low",
      severity: "low",
    });
    expect(report.incidents.recent[1].vehicle).toBe("—");
    expect(report.maintenance).toEqual({ completed: 1, inProgress: 1, pending: 1 });
    expect(report.drivers.total).toBe(2);
    expect(report.drivers.active).toBe(1);
    expect(report.drivers.topPerformers).toEqual([
      { name: "Bob", revenue: 400, shifts: 2 },
      { name: "Alice", revenue: 100, shifts: 1 },
    ]);
    expect(report.drivers.scores).toEqual([
      { driver_id: "u1", name: "Alice", score_level: "green", financial_score: 90 },
      { driver_id: "u2", name: "Chauffeur inconnu", score_level: "red", financial_score: 25 },
    ]);
    expect(report.timeline).toEqual([
      { date: new Date("2026-01-05T10:00:00.000Z"), revenue: 100, validated: true },
      { date: new Date("2026-01-06T10:00:00.000Z"), revenue: 250, validated: false },
      { date: new Date("2026-01-07T10:00:00.000Z"), revenue: 150, validated: true },
      { date: new Date("2026-01-08T10:00:00.000Z"), revenue: 0, validated: false },
    ]);
  });

  it("applique les valeurs par défaut sur un rapport vide", async () => {
    const raw: FleetReportRawRow = {
      fleet: null,
      vehicles: [],
      closures: [],
      incidents: [],
      maintenance: [],
      members: [],
      scores: [],
    };
    const repository = { getReportRaw: vi.fn().mockResolvedValue(raw) };
    const service = new FleetReportService(repository as never);

    const report = await service.getReport("fleet-2", startDate, endDate);

    expect(report.fleet).toEqual({ name: "Ma Flotte", totalVehicles: 0, activeVehicles: 0, blockedVehicles: 0 });
    expect(report.revenue).toEqual({ total: 0, validated: 0, pending: 0, byVehicle: [] });
    expect(report.kilometers).toEqual({ total: 0, average: 0, byVehicle: [] });
    expect(report.incidents).toEqual({
      total: 0,
      bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
      recent: [],
    });
    expect(report.maintenance).toEqual({ completed: 0, inProgress: 0, pending: 0 });
    expect(report.drivers).toEqual({ total: 0, active: 0, topPerformers: [], scores: [] });
    expect(report.timeline).toEqual([]);
  });
});
