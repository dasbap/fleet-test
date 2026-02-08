// Exports des services
export * from './vehicle.service';
export * from './fleet-member.service';
export * from './driver-shift.service';
export * from './incident.service';
export * from './maintenance.service';
export * from './invitation.service';
export * from './dashboard.service';
export * from './fleet-report.service';

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
