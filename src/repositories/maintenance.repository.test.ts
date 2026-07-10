import { beforeEach, describe, expect, it, vi } from "vitest";
import { MaintenanceRepository } from "./maintenance.repository";
import { withConsoleSilenced } from "@/test/withConsoleSilenced";

const fromMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => fromMock(table),
  },
}));

function maintenanceQuery(result: unknown) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    not: vi.fn(() => query),
    lt: vi.fn(() => query),
    gte: vi.fn(() => query),
    in: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn().mockResolvedValue(result),
  };
  return query;
}

describe("MaintenanceRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retries dashboard maintenance window without optional notes/parts columns", async () => {
    const missingNotes = {
      data: null,
      error: {
        code: "42703",
        message: "column travaux_maintenance.notes does not exist",
      },
    };
    const overdue = {
      data: [
        {
          id: "job-1",
          fleet_id: "fleet-1",
          vehicle_id: "vehicle-1",
          created_from_incident_id: null,
          priority: "medium",
          status: "queued",
          planned_at: "2026-07-01T08:00:00.000Z",
          closed_at: null,
          created_at: "2026-07-01T07:00:00.000Z",
          vehicle: null,
        },
      ],
      error: null,
    };
    const upcoming = { data: [], error: null };

    const queries = [
      maintenanceQuery(missingNotes),
      maintenanceQuery(missingNotes),
      maintenanceQuery(overdue),
      maintenanceQuery(upcoming),
    ];
    fromMock.mockImplementation(() => queries.shift());

    await withConsoleSilenced(
      (_method, args) =>
        typeof args[0] === "string" &&
        (args[0] as string).startsWith("Maintenance notes/parts columns unavailable;"),
      async () => {
        const jobs = await new MaintenanceRepository().findDashboardMaintenanceWindow("fleet-1");

        expect(jobs).toHaveLength(1);
        expect(jobs[0]?.id).toBe("job-1");
      },
    );
  });
});
