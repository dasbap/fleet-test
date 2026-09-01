import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildOrganizerTasks,
  incidentToManagerCard,
  incidentToOperationalCard,
  maintenanceJobToIntervention,
  maintenanceJobToScheduledRow,
  plannedShiftToMissionCard,
  shiftToCirculation,
  shiftToMissionCard,
  startOfTodayIso,
} from "@/services/operations.mappers";

const shift = (overrides: Record<string, unknown> = {}) => ({
  id: "shift-1",
  started_at: "2026-08-27T08:15:00.000Z",
  km_start: 1200,
  assignment: {
    vehicle: { registration: "AB-123-CD", brand: "Toyota", model: "Hiace" },
    driver: { full_name: "Jean Dupont" },
  },
  ...overrides,
});

const incident = (severity: string, description = "Incident de test suffisamment détaillé") => ({
  id: `inc-${severity}`,
  description,
  severity,
  created_at: "2026-08-27T09:30:00.000Z",
  vehicle: { registration: "AA-111-AA", brand: "Ford", model: "Transit" },
});

const maintenance = (overrides: Record<string, unknown> = {}) => ({
  id: "job-1",
  status: "queued",
  priority: "medium",
  planned_at: "2026-08-28T10:00:00.000Z",
  notes: "Vidange moteur",
  vehicle: { registration: "CC-222-CC", brand: "Mercedes", model: "Sprinter" },
  incident: { description: "Incident moteur" },
  parts: [{ designation: "Filtre", quantity: 2 }],
  ...overrides,
});

describe("operations mappers coverage", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("mappe un créneau actif complet", () => {
    const card = shiftToMissionCard(shift() as never);
    expect(card).toMatchObject({
      id: "shift-1",
      title: "Créneau actif · AB-123-CD",
      subtitle: "Jean Dupont",
      vehicleLabel: "Toyota Hiace",
      driverName: "Jean",
      status: "in_progress",
      href: "/dashboard/closure",
    });
    expect(card.timeWindow).toContain("1200");
  });

  it("utilise les fallbacks du créneau", () => {
    const value = shift({ assignment: null }) as never;
    expect(shiftToMissionCard(value)).toMatchObject({
      title: "Créneau actif · —",
      vehicleLabel: "—",
      driverName: "Conducteur",
    });
    expect(shiftToCirculation(value)).toMatchObject({ label: "—", driver: "—" });
  });

  it("utilise l'immatriculation si marque et modèle sont absents", () => {
    const value = shift({
      assignment: {
        vehicle: { registration: "ZZ-999-ZZ", brand: null, model: null },
        driver: { full_name: "Alice Martin" },
      },
    }) as never;
    expect(shiftToCirculation(value)).toEqual({
      id: "shift-1",
      label: "ZZ-999-ZZ",
      driver: "Alice Martin",
      route: "Créneau ouvert — suivi opérationnel",
    });
  });

  it.each([
    ["critical", "attention"],
    ["high", "attention"],
    ["medium", "in_progress"],
    ["low", "planned"],
  ])("mappe la sévérité %s pour la carte opérationnelle", (severity, status) => {
    expect(incidentToOperationalCard(incident(severity) as never).status).toBe(status);
  });

  it("tronque les longues descriptions opérationnelles et gère le véhicule absent", () => {
    const card = incidentToOperationalCard({
      ...incident("low", "x".repeat(90)),
      vehicle: null,
    } as never);
    expect(card.title).toBe(`${"x".repeat(72)}…`);
    expect(card.vehicleLabel).toBe("— · —");
  });

  it.each([
    ["critical", "critical", "Priorité critique"],
    ["high", "high", "Suivi rapproché"],
    ["medium", "medium", "Suivi standard"],
    ["low", "medium", "Suivi standard"],
  ])("mappe la sévérité manager %s", (severity, expected, impact) => {
    const card = incidentToManagerCard(incident(severity, "y".repeat(100)) as never);
    expect(card.severity).toBe(expected);
    expect(card.impact).toContain(impact);
    expect(card.title).toBe(`${"y".repeat(80)}…`);
  });

  it("mappe une maintenance planifiée avec notes", () => {
    expect(maintenanceJobToScheduledRow(maintenance() as never)).toMatchObject({
      id: "job-1",
      vehicleLabel: "Mercedes Sprinter",
      label: "Vidange moteur",
      status: "planned",
      href: "/dashboard/maintenance",
    });
  });

  it.each([
    ["in_progress", "in_progress"],
    ["blocked", "blocked"],
    ["ready", "planned"],
  ])("mappe le statut planifié %s", (status, expected) => {
    expect(maintenanceJobToScheduledRow(maintenance({ status }) as never).status).toBe(expected);
  });

  it("utilise incident puis fallback pour le libellé maintenance", () => {
    expect(maintenanceJobToScheduledRow(maintenance({ notes: "", planned_at: null }) as never)).toMatchObject({
      label: "Incident moteur",
      scheduledLabel: "Date à confirmer",
    });
    expect(
      maintenanceJobToScheduledRow(
        maintenance({ notes: "", incident: null, vehicle: null, planned_at: null }) as never,
      ),
    ).toMatchObject({ label: "Intervention maintenance", vehicleLabel: "—" });
  });

  it.each([
    ["queued", "planned", false],
    ["in_progress", "in_progress", false],
    ["ready", "completed", true],
    ["blocked", "blocked", false],
    ["unexpected", "planned", false],
  ])("mappe l'intervention %s", (status, expected, canClose) => {
    const result = maintenanceJobToIntervention(maintenance({ status }) as never);
    expect(result.status).toBe(expected);
    expect(result.canClose).toBe(canClose);
    expect(result.actionsDone).toEqual(["Filtre × 2"]);
  });

  it("utilise les fallbacks de diagnostic intervention", () => {
    expect(maintenanceJobToIntervention(maintenance({ notes: "", parts: null }) as never).diagnostic).toBe(
      "Incident moteur",
    );
    expect(
      maintenanceJobToIntervention(
        maintenance({ notes: "", incident: null, parts: undefined, vehicle: null }) as never,
      ),
    ).toMatchObject({
      diagnostic: "Intervention atelier — détail dans la fiche maintenance.",
      actionsDone: [],
      plate: "—",
    });
  });

  it("construit toutes les tâches organisateur au pluriel", () => {
    const tasks = buildOrganizerTasks({ pendingClosureCount: 2, queuedMaintenanceCount: 3, recentIncidentCount: 4 });
    expect(tasks).toHaveLength(3);
    expect(tasks.map((task) => task.label)).toEqual([
      "Valider 2 clôtures en attente",
      "3 interventions en file d’attente",
      "Suivre 4 incidents récents",
    ]);
  });

  it("construit les libellés singuliers", () => {
    const tasks = buildOrganizerTasks({ pendingClosureCount: 1, queuedMaintenanceCount: 1, recentIncidentCount: 1 });
    expect(tasks.map((task) => task.label)).toEqual([
      "Valider une clôture de créneau en attente",
      "Une intervention maintenance en file d’attente",
      "Relire un incident récent sur le parc",
    ]);
  });

  it("retourne une tâche de contrôle si rien n'est urgent", () => {
    expect(buildOrganizerTasks({ pendingClosureCount: 0, queuedMaintenanceCount: 0, recentIncidentCount: 0 })).toEqual([
      expect.objectContaining({ id: "task-ok", status: "completed" }),
    ]);
  });

  it.each([
    ["started", "in_progress"],
    ["missed", "attention"],
    ["cancelled", "blocked"],
    ["planned", "planned"],
  ])("mappe le créneau planifié %s", (status, expected) => {
    const card = plannedShiftToMissionCard({
      id: `planned-${status}`,
      status,
      planned_start: "2026-08-27T12:00:00.000Z",
      planned_end: "2026-08-27T14:00:00.000Z",
      notes: "Ligne centre-ville",
      vehicle: { registration: "DD-444-DD", brand: "Iveco", model: "Daily" },
    } as never, "Moussa");
    expect(card).toMatchObject({ status: expected, driverName: "Moussa", subtitle: "Ligne centre-ville", vehicleLabel: "Iveco Daily" });
    expect(card.timeWindow).toContain("–");
  });

  it("gère les fallbacks du créneau planifié", () => {
    const card = plannedShiftToMissionCard({
      id: "planned-fallback",
      status: "planned",
      planned_start: "2026-08-27T12:00:00.000Z",
      planned_end: null,
      notes: null,
      vehicle: null,
    } as never);
    expect(card).toMatchObject({ driverName: "Conducteur", vehicleLabel: "—", subtitle: undefined });
    expect(card.timeWindow).not.toContain("–");
  });

  it("calcule le début de journée locale", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-27T15:42:11.000Z"));
    const value = new Date(startOfTodayIso());
    expect(value.getHours()).toBe(0);
    expect(value.getMinutes()).toBe(0);
    expect(value.getSeconds()).toBe(0);
    expect(value.getMilliseconds()).toBe(0);
  });
});
