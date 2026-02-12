// Exports des services
export * from './vehicle.service';
export * from './fleet-member.service';
export * from './driver-shift.service';
export * from './incident.service';
export * from './maintenance.service';
export * from './invitation.service';
export * from './dashboard.service';
export * from './fleet-report.service';
export * from './fleet.service';
export * from './assignment.service';
export * from './alert.service';
export * from './driver-score.service';
export * from './user-search.service';
export * from './system-health.service';
export * from './esamba-verification.service';
export * from './esamba-setup.service';
export * from './profile.service';
export * from './avatar.service';
export * from './maintenance-evidence.service';

// Réexporter les types pour compatibilité
export type { Vehicle, VehicleInsert, VehicleStatus } from '@/hooks/useVehicles';
export type { FleetMember, AddMemberData } from '@/hooks/useFleetMembers';
export type {
  DriverShift,
  ShiftClosure,
  ShiftClosureInsert,
  ShiftStatus,
  CollectionMode,
} from '@/hooks/useDriverShifts';
