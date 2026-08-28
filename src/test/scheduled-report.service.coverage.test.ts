import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ScheduledReportService } from "@/services/scheduled-report.service";

const makeRepository = () => ({
  findByFleetId: vi.fn(),
  findRunsByReportId: vi.fn(),
  create: vi.fn(),
  updateActive: vi.fn(),
  delete: vi.fn(),
});

const input = (overrides: Record<string, unknown> = {}) => ({
  report_type: "fleet_summary",
  format: "pdf",
  frequency: "daily",
  send_hour_utc: 9,
  recipient_emails: ["ops@example.com"],
  ...overrides,
});

describe("ScheduledReportService", () => {
  let repository: ReturnType<typeof makeRepository>;
  let service: ScheduledReportService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-27T10:30:00.000Z"));
    repository = makeRepository();
    service = new ScheduledReportService(repository as never);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("retourne vide sans identifiant de flotte", async () => {
    await expect(service.getScheduledReports("")).resolves.toEqual([]);
    expect(repository.findByFleetId).not.toHaveBeenCalled();
  });

  it("délègue la liste des rapports", async () => {
    repository.findByFleetId.mockResolvedValue([{ id: "report-1" }]);
    await expect(service.getScheduledReports("fleet-1")).resolves.toEqual([{ id: "report-1" }]);
    expect(repository.findByFleetId).toHaveBeenCalledWith("fleet-1");
  });

  it("retourne vide sans identifiant de rapport", async () => {
    await expect(service.getReportRuns("")).resolves.toEqual([]);
    expect(repository.findRunsByReportId).not.toHaveBeenCalled();
  });

  it("délègue les exécutions d'un rapport", async () => {
    repository.findRunsByReportId.mockResolvedValue([{ id: "run-1" }]);
    await expect(service.getReportRuns("report-1")).resolves.toEqual([{ id: "run-1" }]);
  });

  it.each([
    ["", "user-1"],
    ["fleet-1", ""],
  ])("refuse la création sans authentification", async (fleetId, userId) => {
    await expect(service.createScheduledReport(fleetId, userId, input() as never)).rejects.toThrow("Authentification requise");
  });

  it("refuse la création sans destinataire", async () => {
    await expect(
      service.createScheduledReport("fleet-1", "user-1", input({ recipient_emails: [] }) as never),
    ).rejects.toThrow("Au moins un destinataire e-mail est requis");
  });

  it("planifie un rapport quotidien au lendemain si l'heure est passée", async () => {
    repository.create.mockImplementation(async (row) => row);
    const result = await service.createScheduledReport("fleet-1", "user-1", input({ send_hour_utc: 9 }) as never);
    expect(result).toMatchObject({ fleet_id: "fleet-1", created_by: "user-1" });
    expect((result as { next_run_at: string }).next_run_at).toBe("2026-08-28T09:00:00.000Z");
  });

  it("planifie un rapport quotidien le jour même si l'heure est future", async () => {
    repository.create.mockImplementation(async (row) => row);
    const result = await service.createScheduledReport("fleet-1", "user-1", input({ send_hour_utc: 15 }) as never);
    expect((result as { next_run_at: string }).next_run_at).toBe("2026-08-27T15:00:00.000Z");
  });

  it("planifie un rapport hebdomadaire sur le prochain jour demandé", async () => {
    repository.create.mockImplementation(async (row) => row);
    const result = await service.createScheduledReport(
      "fleet-1",
      "user-1",
      input({ frequency: "weekly", day_of_week: 5, send_hour_utc: 8 }) as never,
    );
    expect((result as { next_run_at: string }).next_run_at).toBe("2026-08-28T08:00:00.000Z");
  });

  it("utilise lundi par défaut pour l'hebdomadaire", async () => {
    repository.create.mockImplementation(async (row) => row);
    const result = await service.createScheduledReport(
      "fleet-1",
      "user-1",
      input({ frequency: "weekly", day_of_week: undefined, send_hour_utc: 8 }) as never,
    );
    expect((result as { next_run_at: string }).next_run_at).toBe("2026-08-31T08:00:00.000Z");
  });

  it("repousse d'une semaine si le créneau hebdomadaire du jour est passé", async () => {
    repository.create.mockImplementation(async (row) => row);
    const result = await service.createScheduledReport(
      "fleet-1",
      "user-1",
      input({ frequency: "weekly", day_of_week: 4, send_hour_utc: 8 }) as never,
    );
    expect((result as { next_run_at: string }).next_run_at).toBe("2026-09-03T08:00:00.000Z");
  });

  it("planifie un rapport mensuel ce mois-ci", async () => {
    repository.create.mockImplementation(async (row) => row);
    const result = await service.createScheduledReport(
      "fleet-1",
      "user-1",
      input({ frequency: "monthly", day_of_month: 30, send_hour_utc: 6 }) as never,
    );
    expect((result as { next_run_at: string }).next_run_at).toBe("2026-08-30T06:00:00.000Z");
  });

  it("planifie un rapport mensuel au mois suivant si la date est passée", async () => {
    repository.create.mockImplementation(async (row) => row);
    const result = await service.createScheduledReport(
      "fleet-1",
      "user-1",
      input({ frequency: "monthly", day_of_month: 1, send_hour_utc: 6 }) as never,
    );
    expect((result as { next_run_at: string }).next_run_at).toBe("2026-09-01T06:00:00.000Z");
  });

  it("utilise le premier jour par défaut pour le mensuel", async () => {
    repository.create.mockImplementation(async (row) => row);
    const result = await service.createScheduledReport(
      "fleet-1",
      "user-1",
      input({ frequency: "monthly", day_of_month: undefined, send_hour_utc: 6 }) as never,
    );
    expect((result as { next_run_at: string }).next_run_at).toBe("2026-09-01T06:00:00.000Z");
  });

  it("active ou désactive un rapport", async () => {
    await service.toggleActive("report-1", false);
    expect(repository.updateActive).toHaveBeenCalledWith("report-1", false);
  });

  it("refuse de basculer un rapport sans id", async () => {
    await expect(service.toggleActive("", true)).rejects.toThrow("Identifiant du rapport requis");
  });

  it("supprime un rapport", async () => {
    await service.deleteScheduledReport("report-1");
    expect(repository.delete).toHaveBeenCalledWith("report-1");
  });

  it("refuse de supprimer un rapport sans id", async () => {
    await expect(service.deleteScheduledReport("")).rejects.toThrow("Identifiant du rapport requis");
  });
});
