/**
 * Types et utilitaires pour le module Opérations (données issues du repository ou démo).
 */

export type MockOpsStatus =
  | "planned"
  | "in_progress"
  | "completed"
  | "blocked"
  | "attention";

export const mockStatusLabels: Record<MockOpsStatus, string> = {
  planned: "Planifié",
  in_progress: "En cours",
  completed: "Terminé",
  blocked: "Bloqué",
  attention: "Attention",
};

export interface MockMissionCard {
  id: string;
  title: string;
  subtitle?: string;
  vehicleLabel: string;
  driverName?: string;
  timeWindow: string;
  status: MockOpsStatus;
  href: string;
}

export interface MockTaskItem {
  id: string;
  label: string;
  assignee: string;
  dueLabel: string;
  status: MockOpsStatus;
  href: string;
}

export interface MockManagerIncident {
  id: string;
  title: string;
  vehicleLabel: string;
  severity: "critical" | "high" | "medium";
  impact: string;
  href: string;
}

export interface MockScheduledMaintenance {
  id: string;
  vehicleLabel: string;
  label: string;
  scheduledLabel: string;
  status: MockOpsStatus;
  href: string;
}

export interface MockMechanicIntervention {
  id: string;
  vehicleLabel: string;
  plate: string;
  priority: "low" | "medium" | "high" | "critical";
  status: MockOpsStatus;
  diagnostic: string;
  actionsDone: string[];
  canClose: boolean;
  href: string;
}

export interface MockChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export interface MockChecklist {
  id: "departure" | "arrival";
  title: string;
  items: MockChecklistItem[];
}

export interface MockDriverDay {
  missionTitle: string;
  missionRoute: string;
  missionStatus: MockOpsStatus;
  missionTime: string;
  vehicleLabel: string;
  vehiclePlate: string;
  vehicleKm: string;
  /** Créneau conducteur ouvert, pour persistance checklist locale. */
  activeShiftId?: string | null;
  vehicleId?: string | null;
  fleetId?: string | null;
  departureChecklist: MockChecklist;
  arrivalChecklist: MockChecklist;
}

export interface OrganizerOperationsMock {
  missionsToday: MockMissionCard[];
  plannedShiftsToday: MockMissionCard[];
  vehiclesInService: { id: string; label: string; driver: string; route: string }[];
  operationalIncidents: MockMissionCard[];
  assignedTasks: MockTaskItem[];
}

export interface ManagerOperationsMock {
  summary: { label: string; value: string; hint?: string }[];
  incidents: MockManagerIncident[];
  scheduledMaintenance: MockScheduledMaintenance[];
}

export interface MechanicOperationsMock {
  interventionsToday: MockMechanicIntervention[];
}

/** Checklists par défaut (conducteur) — complétées côté repository si besoin. */
export function getDefaultDriverChecklists(): {
  departureChecklist: MockChecklist;
  arrivalChecklist: MockChecklist;
} {
  return {
    departureChecklist: {
      id: "departure",
      title: "Checklist départ",
      items: [
        { id: "d1", label: "Feux, essuie-glaces et signalisation", done: false },
        { id: "d2", label: "Niveaux (huile, liquide de refroidissement, lave-glace)", done: false },
        { id: "d3", label: "Pneus, pression et roue de secours", done: false },
        { id: "d4", label: "Cargos / arrimages et documents de transport", done: false },
      ],
    },
    arrivalChecklist: {
      id: "arrival",
      title: "Checklist arrivée",
      items: [
        { id: "a1", label: "Véhicule sécurisé et clés remises", done: false },
        { id: "a2", label: "Constat visuel (chocs, crevaison)", done: false },
        { id: "a3", label: "Kilométrage fin de service saisi", done: false },
      ],
    },
  };
}

/**
 * Synthèse atelier : dossiers non soldés, volume d’actions saisies, interventions prêtes à clôturer.
 */
export function getMechanicDaySummary(interventions: MockMechanicIntervention[]): {
  diagnosticsEnCours: number;
  actionsRealisees: number;
  cloturesPossibles: number;
} {
  const diagnosticsEnCours = interventions.filter((i) => i.status !== "completed").length;
  const actionsRealisees = interventions.reduce((acc, i) => acc + i.actionsDone.length, 0);
  const cloturesPossibles = interventions.filter((i) => i.canClose).length;
  return { diagnosticsEnCours, actionsRealisees, cloturesPossibles };
}
