import { useSyncExternalStore } from "react";
import type {
  FleetIncidentAlertDetail,
  IncidentAlertAssignee,
  IncidentWorkflowStatus,
} from "@/types/incident-alert";
import { INITIAL_MOCK_INCIDENT_ALERTS } from "@/features/alerts/data/mockIncidentAlerts";
import { MOCK_INCIDENT_ASSIGNEES } from "@/features/alerts/data/mockAssignees";

interface IncidentAlertsState {
  alerts: FleetIncidentAlertDetail[];
}

let state: IncidentAlertsState = {
  alerts: JSON.parse(
    JSON.stringify(INITIAL_MOCK_INCIDENT_ALERTS)
  ) as FleetIncidentAlertDetail[],
};

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

function getSnapshot(): IncidentAlertsState {
  return state;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setState(next: IncidentAlertsState) {
  state = next;
  emit();
}

function historyLabelForStatus(s: IncidentWorkflowStatus): string {
  switch (s) {
    case "NOUVEAU":
      return "Statut passé en NOUVEAU";
    case "EN_COURS":
      return "Statut passé en EN_COURS";
    case "RESOLU":
      return "Statut passé en RESOLU";
    default:
      return "Statut mis à jour";
  }
}

/** Liste complète (démo session) pour filtres / tri. */
export function useIncidentAlertsMock(): FleetIncidentAlertDetail[] {
  const s = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return s.alerts;
}

export function getIncidentAlertById(
  id: string | undefined
): FleetIncidentAlertDetail | undefined {
  if (!id) return undefined;
  return state.alerts.find((a) => a.id === id);
}

export function useIncidentAlertDetail(
  id: string | undefined
): FleetIncidentAlertDetail | undefined {
  const alerts = useIncidentAlertsMock();
  return id ? alerts.find((a) => a.id === id) : undefined;
}

export function updateIncidentStatus(
  alertId: string,
  status: IncidentWorkflowStatus
): void {
  const now = new Date().toISOString();
  setState({
    alerts: state.alerts.map((a) => {
      if (a.id !== alertId) return a;
      return {
        ...a,
        status,
        updatedAt: now,
        history: [
          {
            id: `h-${Date.now()}`,
            at: now,
            label: historyLabelForStatus(status),
          },
          ...a.history,
        ],
      };
    }),
  });
}

export function assignIncident(
  alertId: string,
  assignee: IncidentAlertAssignee | null
): void {
  const now = new Date().toISOString();
  setState({
    alerts: state.alerts.map((a) => {
      if (a.id !== alertId) return a;
      return {
        ...a,
        assignee,
        updatedAt: now,
        history: [
          {
            id: `h-${Date.now()}`,
            at: now,
            label: assignee
              ? `Responsable affecté : ${assignee.fullName}`
              : "Responsable retiré",
          },
          ...a.history,
        ],
      };
    }),
  });
}

export function addIncidentComment(
  alertId: string,
  authorName: string,
  body: string
): void {
  const trimmed = body.trim();
  if (!trimmed) return;
  const now = new Date().toISOString();
  const comment = {
    id: `cm-${Date.now()}`,
    authorName,
    body: trimmed,
    createdAt: now,
  };
  setState({
    alerts: state.alerts.map((a) => {
      if (a.id !== alertId) return a;
      return {
        ...a,
        comments: [...a.comments, comment],
        updatedAt: now,
        history: [
          {
            id: `h-${Date.now()}`,
            at: now,
            label: `Commentaire ajouté par ${authorName}`,
          },
          ...a.history,
        ],
      };
    }),
  });
}

/** Résout un id de responsable en objet assignee (liste mock). */
export function resolveAssigneeById(
  id: string | null
): IncidentAlertAssignee | null {
  if (!id || id === "none") return null;
  return MOCK_INCIDENT_ASSIGNEES.find((u) => u.id === id) ?? null;
}
