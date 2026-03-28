import type {
  FleetIncidentAlertDetail,
  IncidentSeverityFilter,
  IncidentStatusFilter,
} from "@/types/incident-alert";

const SEVERITY_ORDER: Record<string, number> = {
  critique: 0,
  haute: 1,
  moyenne: 2,
  basse: 3,
};

export function filterIncidentAlerts(
  items: FleetIncidentAlertDetail[],
  severity: IncidentSeverityFilter,
  status: IncidentStatusFilter
): FleetIncidentAlertDetail[] {
  return items.filter((a) => {
    if (severity !== "all" && a.severity !== severity) return false;
    if (status !== "all" && a.status !== status) return false;
    return true;
  });
}

/** Critique d’abord, puis date décroissante. */
export function sortIncidentAlertsByPriority(
  items: FleetIncidentAlertDetail[]
): FleetIncidentAlertDetail[] {
  return [...items].sort((a, b) => {
    const sa = SEVERITY_ORDER[a.severity] ?? 99;
    const sb = SEVERITY_ORDER[b.severity] ?? 99;
    if (sa !== sb) return sa - sb;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}
