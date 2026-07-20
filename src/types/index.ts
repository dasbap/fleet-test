/**
 * Rôles — une seule sémantique par nom :
 * - AppRole / FleetRole / RoleType → rôles persistés flotte
 * - PlatformRole → AppRole | "admin" (RBAC plateforme)
 * - Role → alias PlatformRole via `@/config/permissions` (composants)
 * - MobileAppRole → nomenclature mobile (bridge → AppRole)
 */
export type { MobileAppRole } from "./mobile-app-role";
export {
  MOBILE_APP_ROLE_LABELS,
  MOBILE_APP_ROLE_ORDER,
} from "./mobile-app-role";
export type { FleetRole } from "./role";
export {
  FLEET_ROLE_LABELS,
  FLEET_ROLE_PRIORITY,
  fleetRoleAtLeast,
} from "./role";
export type { AppRole } from "./auth";
export type { PlatformRole } from "./rbac";
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
export type { DashboardAlert, KpiSummary, ActionKind } from "./dashboard";
export type {
  VehicleSearchAlertSeverity,
  VehicleSearchFilters,
  VehicleSearchMaintenanceType,
  VehicleSearchResult,
  VehicleSearchStatus,
} from "./search";
export type { Mission, MissionStatus, MissionStep } from "./mission";
export type { ActivationMetrics } from "./activation-metrics";
export type { FleetBillingContext } from "./fleet-billing";
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
export type {
  VehicleApi,
  VehicleDomain,
  VehicleInsertApi,
  VehicleStatusApi,
} from "./api/vehicles";
