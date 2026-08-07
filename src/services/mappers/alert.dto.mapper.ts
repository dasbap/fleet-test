import type { Alert, AlertSeverity, AlertStatus, AlertType } from "@/types/alert";
import type { AlertDto, OperationalAlertTypeDto } from "@/types/dto/alert.dto";

/** Correspondance grossière sévérité opérationnelle → domaine. */
function mapSeverity(dto: AlertDto): AlertSeverity {
  if (dto.severity === "critical") return "critical";
  if (dto.severity === "high" || dto.severity === "medium") return "warning";
  return "info";
}

function mapStatus(dto: AlertDto): AlertStatus {
  if (dto.resolved) return "resolved";
  return "open";
}

function mapType(dtoType: OperationalAlertTypeDto): AlertType {
  return dtoType;
}

/**
 * Projection vers le modèle domaine `Alert` (titres / véhicule optionnel).
 * Utilisé quand l’UI consomme le type domaine plutôt que le DTO table.
 */
export function mapOperationalAlertDtoToDomain(dto: AlertDto): Alert {
  return {
    id: dto.id,
    fleetId: dto.fleet_id,
    vehicleId: dto.vehicle_id,
    type: mapType(dto.alert_type),
    title: dto.alert_type.replace(/_/g, " "),
    message: dto.message,
    severity: mapSeverity(dto),
    status: mapStatus(dto),
    createdAt: dto.created_at,
    updatedAt: dto.resolved_at ?? dto.created_at,
    resolvedAt: dto.resolved_at,
    faqQuestionId: dto.faq_question_id ?? null,
  };
}
