// Exports des services
export * from './vehicle.service';
export * from './fleet-member.service';
export * from './driver-shift.service';
export * from './incident.service';
export * from './maintenance.service';
export * from './invitation.service';
export * from './dashboard.service';
export * from './dashboard-alert.service';
export * from './fleet-report.service';
export * from './fleet.service';
export * from './assignment.service';
export * from './alert.service';
export * from './driver-score.service';
export * from './fleet-activation.service';
export * from './fleet-billing.service';
export * from './user-search.service';
export * from './system-health.service';
export * from './esamba-verification.service';
export * from './esamba-setup.service';
export * from './profile.service';
export * from './avatar.service';
export * from './maintenance-evidence.service';
export * from './share.service';
export * from './deep-link.service';
export * from './push-notification.service';
export * from './push-notifications-client.service';
export * from './notification.service';
export * from './send-whatsapp-edge.service';
export * from './camera.service';
export * from './onboarding.service';
export * from './vehicle-search.service';
export * from './feedback.service';
export * from './failure-prediction.service';
export * from "./fleet-tracking.service";
export * from "./tenant-access.service";
export * from "./billing.service";
export * from "./whatsapp-monitoring.service";
export * from "./haptics.service";
export * from "./tutorial-offline.service";

// Réexporter les types pour compatibilité
export type { VehicleDto, VehicleInsertDto, VehicleStatusDto } from '@/types/dto/vehicle.dto';
export type { Vehicle, VehicleInsert, VehicleStatus } from '@/hooks/useVehicles';
export type { FleetMember, AddMemberData } from '@/hooks/useFleetMembers';
export type {
  DriverShift,
  ShiftClosure,
  ShiftClosureInsert,
  ShiftStatus,
  CollectionMode,
} from '@/hooks/useDriverShifts';
