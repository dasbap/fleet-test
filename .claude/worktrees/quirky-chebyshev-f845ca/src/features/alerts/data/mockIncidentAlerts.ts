import type { FleetIncidentAlertDetail } from "@/types/incident-alert";
import { MOCK_DEMO_INCIDENT_ALERTS } from "@/mocks/demo/incidentAlerts";

/** Copie profonde pour le store session (mutations locales). */
export const INITIAL_MOCK_INCIDENT_ALERTS: FleetIncidentAlertDetail[] = JSON.parse(
  JSON.stringify(MOCK_DEMO_INCIDENT_ALERTS)
) as FleetIncidentAlertDetail[];
