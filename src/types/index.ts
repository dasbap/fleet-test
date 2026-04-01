export type { MobileAppRole, Role } from "./mobile-app-role";
export {
  MOBILE_APP_ROLE_LABELS,
  MOBILE_APP_ROLE_ORDER,
} from "./mobile-app-role";
export type { FleetRole, Role } from "./role";
export {
  FLEET_ROLE_LABELS,
  FLEET_ROLE_PRIORITY,
  fleetRoleAtLeast,
} from "./role";
/**
 * Types domaine : `User` = utilisateur métier (`FleetUser`), pas la session Supabase (`AuthUser` dans `./auth`).
 */
export type { FleetUser, FleetUserPreferences, User } from "./user";
export type {
  Vehicle,
  VehicleOperationalStatus,
  VehicleSummary,
} from "./vehicle";
export type { Alert, AlertFilters, AlertSeverity, AlertStatus } from "./alert";
export type { Mission, MissionStatus, MissionStep } from "./mission";
export type {
  FleetVehicleAssignedDriver,
  FleetVehicleAvailability,
  FleetVehicleDetail,
  FleetVehicleDocumentExpiry,
  FleetVehicleFilterTab,
  FleetVehicleListItem,
  FleetVehicleMaintenanceEntry,
  FleetVehicleTimelineEvent,
  FleetVehicleTimelineEventType,
} from "./fleet-vehicle";
export type {
  FleetIncidentAlertDetail,
  FleetIncidentAlertListItem,
  IncidentAlertAssignee,
  IncidentAlertComment,
  IncidentAlertKind,
  IncidentAlertSeverity,
  IncidentAttachmentSimulated,
  IncidentHistoryEntry,
  IncidentSeverityFilter,
  IncidentStatusFilter,
  IncidentWorkflowStatus,
} from "./incident-alert";
/** DTO persistance (tables) — distincts des types domaine ci-dessus. */
export type {
  AlertDto,
  OperationalAlertSeverityDto,
  OperationalAlertTypeDto,
  VehicleDto,
  VehicleInsertDto,
  VehicleStatusDto,
} from "./dto";
