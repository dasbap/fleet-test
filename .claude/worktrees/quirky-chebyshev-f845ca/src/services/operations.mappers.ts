import type { Incident } from "@/repositories/incident.repository";
import type { MaintenanceJob, JobStatus } from "@/repositories/maintenance.repository";
import type { DriverShift } from "@/repositories/driver-shift.repository";
import type {
  MockMissionCard,
  MockOpsStatus,
  MockTaskItem,
  MockManagerIncident,
  MockScheduledMaintenance,
  MockMechanicIntervention,
} from "@/features/operations/mocks/operationsMock";

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

function vehicleLabelFromParts(brand: string | null | undefined, model: string | null | undefined, registration: string) {
  const name = [brand, model].filter(Boolean).join(" ").trim();
  return name || registration;
}

/** Carte « mission » à partir d’un créneau ouvert. */
export function shiftToMissionCard(shift: DriverShift): MockMissionCard {
  const v = shift.assignment?.vehicle;
  const reg = v?.registration ?? "—";
  const driverName = shift.assignment?.driver?.full_name?.split(" ")[0] ?? "Conducteur";
  return {
    id: shift.id,
    title: `Créneau actif · ${reg}`,
    subtitle: shift.assignment?.driver?.full_name ?? undefined,
    vehicleLabel: vehicleLabelFromParts(v?.brand, v?.model, reg),
    driverName,
    timeWindow: `Démarré à ${fmtTime(shift.started_at)} · km départ ${shift.km_start}`,
    status: "in_progress",
    href: "/dashboard/closure",
  };
}

/** Véhicule en circulation (à partir d’un créneau ouvert). */
export function shiftToCirculation(shift: DriverShift): {
  id: string;
  label: string;
  driver: string;
  route: string;
} {
  const v = shift.assignment?.vehicle;
  const reg = v?.registration ?? "—";
  return {
    id: shift.id,
    label: vehicleLabelFromParts(v?.brand, v?.model, reg),
    driver: shift.assignment?.driver?.full_name ?? "—",
    route: "Créneau ouvert — suivi opérationnel",
  };
}

function incidentSeverityToMissionStatus(severity: string): MockOpsStatus {
  if (severity === "critical" || severity === "high") return "attention";
  if (severity === "medium") return "in_progress";
  return "planned";
}

/** Incident opérationnel affiché comme carte mission. */
export function incidentToOperationalCard(inc: Incident): MockMissionCard {
  const v = inc.vehicle;
  const reg = v?.registration ?? "—";
  const title =
    inc.description.length > 72 ? `${inc.description.slice(0, 72)}…` : inc.description;
  return {
    id: inc.id,
    title,
    vehicleLabel: `${vehicleLabelFromParts(v?.brand, v?.model, reg)} · ${reg}`,
    timeWindow: `Signalé ${fmtDateTime(inc.created_at)}`,
    status: incidentSeverityToMissionStatus(inc.severity),
    href: "/dashboard/incidents",
  };
}

function mapSeverityToManager(
  s: string
): MockManagerIncident["severity"] {
  if (s === "critical" || s === "high") return s === "critical" ? "critical" : "high";
  return "medium";
}

export function incidentToManagerCard(inc: Incident): MockManagerIncident {
  const v = inc.vehicle;
  const reg = v?.registration ?? "";
  const vehicleLabel = vehicleLabelFromParts(v?.brand, v?.model, reg) || "Véhicule";
  const impact =
    inc.severity === "critical"
      ? "Priorité critique — retirer du service si nécessaire"
      : inc.severity === "high"
        ? "Suivi rapproché recommandé"
        : "Suivi standard";
  return {
    id: inc.id,
    title: inc.description.length > 80 ? `${inc.description.slice(0, 80)}…` : inc.description,
    vehicleLabel,
    severity: mapSeverityToManager(inc.severity),
    impact,
    href: "/dashboard/incidents",
  };
}

export function maintenanceJobToScheduledRow(job: MaintenanceJob): MockScheduledMaintenance {
  const v = job.vehicle;
  const reg = v?.registration ?? "—";
  const planned = job.planned_at
    ? new Date(job.planned_at).toLocaleString("fr-FR", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Date à confirmer";
  const label = job.notes?.trim() || job.incident?.description?.slice(0, 60) || "Intervention maintenance";
  const status: MockOpsStatus =
    job.status === "in_progress"
      ? "in_progress"
      : job.status === "blocked"
        ? "blocked"
        : "planned";
  return {
    id: job.id,
    vehicleLabel: vehicleLabelFromParts(v?.brand, v?.model, reg),
    label,
    scheduledLabel: planned,
    status,
    href: `/dashboard/maintenance`,
  };
}

function jobStatusToMockOps(status: JobStatus): MockOpsStatus {
  switch (status) {
    case "queued":
      return "planned";
    case "in_progress":
      return "in_progress";
    case "ready":
      return "completed";
    case "blocked":
      return "blocked";
    default:
      return "planned";
  }
}

export function maintenanceJobToIntervention(job: MaintenanceJob): MockMechanicIntervention {
  const v = job.vehicle;
  const reg = v?.registration ?? "—";
  const diagnostic =
    job.notes?.trim() ||
    job.incident?.description?.trim() ||
    "Intervention atelier — détail dans la fiche maintenance.";
  const parts = job.parts ?? [];
  const actionsDone = parts.map((p) => `${p.designation} × ${p.quantity}`);
  return {
    id: job.id,
    vehicleLabel: vehicleLabelFromParts(v?.brand, v?.model, reg),
    plate: reg,
    priority: job.priority,
    status: jobStatusToMockOps(job.status),
    diagnostic,
    actionsDone,
    canClose: job.status === "ready",
    href: "/dashboard/maintenance",
  };
}

/** Tâches synthétiques pour l’organisateur (file d’attente réelle). */
export function buildOrganizerTasks(input: {
  pendingClosureCount: number;
  queuedMaintenanceCount: number;
  recentIncidentCount: number;
}): MockTaskItem[] {
  const tasks: MockTaskItem[] = [];
  if (input.pendingClosureCount > 0) {
    tasks.push({
      id: "task-closures",
      label:
        input.pendingClosureCount === 1
          ? "Valider une clôture de créneau en attente"
          : `Valider ${input.pendingClosureCount} clôtures en attente`,
      assignee: "Vous",
      dueLabel: "Dès que possible",
      status: "attention",
      href: "/dashboard/closure",
    });
  }
  if (input.queuedMaintenanceCount > 0) {
    tasks.push({
      id: "task-maint-queue",
      label:
        input.queuedMaintenanceCount === 1
          ? "Une intervention maintenance en file d’attente"
          : `${input.queuedMaintenanceCount} interventions en file d’attente`,
      assignee: "Atelier",
      dueLabel: "Aujourd’hui",
      status: "in_progress",
      href: "/dashboard/maintenance",
    });
  }
  if (input.recentIncidentCount > 0) {
    tasks.push({
      id: "task-incidents",
      label:
        input.recentIncidentCount === 1
          ? "Relire un incident récent sur le parc"
          : `Suivre ${input.recentIncidentCount} incidents récents`,
      assignee: "Vous",
      dueLabel: "Cette semaine",
      status: "planned",
      href: "/dashboard/incidents",
    });
  }
  if (tasks.length === 0) {
    tasks.push({
      id: "task-ok",
      label: "Aucune tâche urgente — parc sous contrôle",
      assignee: "—",
      dueLabel: "—",
      status: "completed",
      href: "/dashboard/alerts",
    });
  }
  return tasks;
}

export function startOfTodayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}
