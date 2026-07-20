import { useMemo } from "react";
import { useIncidents, type Incident } from "@/hooks/useIncidents";
import type {
  FleetIncidentAlertDetail,
  IncidentAlertKind,
  IncidentAlertSeverity,
  IncidentWorkflowStatus,
} from "@/types/incident-alert";

function mapSeverity(s: Incident["severity"]): IncidentAlertSeverity {
  switch (s) {
    case "low": return "basse";
    case "medium": return "moyenne";
    case "high": return "haute";
    case "critical": return "critique";
  }
}

function mapStatus(s: Incident["status"]): IncidentWorkflowStatus {
  switch (s) {
    case "open": return "NOUVEAU";
    case "investigating": return "EN_COURS";
    case "resolved":
    case "closed": return "RESOLU";
  }
}

function mapKind(category: string | null): IncidentAlertKind {
  switch (category) {
    case "breakdown":
    case "fire":
    case "accident": return "breakdown_reported";
    case "damage": return "technical_feedback";
    case "theft": return "mission_anomaly";
    default: return "mission_anomaly";
  }
}

function buildVehicleLabel(v: Incident["vehicle"]): string {
  if (!v) return "Véhicule inconnu";
  return [v.registration, v.brand, v.model].filter(Boolean).join(" ");
}

function incidentToAlert(incident: Incident): FleetIncidentAlertDetail {
  const vehicleLabel = buildVehicleLabel(incident.vehicle);
  const fleetId = incident.vehicle?.fleet_id ?? "";
  const title = incident.description.length > 80
    ? incident.description.slice(0, 77) + "…"
    : incident.description;

  return {
    id: incident.id,
    title,
    kind: mapKind(incident.incident_category),
    vehicleLabel,
    severity: mapSeverity(incident.severity),
    status: mapStatus(incident.status),
    createdAt: incident.created_at,
    updatedAt: incident.resolved_at ?? incident.created_at,
    fleetId,
    vehicleId: incident.vehicle_id,
    description: incident.description,
    assignee: null,
    comments: [],
    history: [],
    attachments: [],
    driverContact: incident.driver?.full_name
      ? { name: incident.driver.full_name, phone: "" }
      : undefined,
  };
}

export function useIncidentAlerts(fleetId: string | undefined) {
  const query = useIncidents(fleetId);

  const alerts = useMemo<FleetIncidentAlertDetail[]>(
    () => (query.data ?? []).map(incidentToAlert),
    [query.data],
  );

  return { ...query, data: alerts };
}
