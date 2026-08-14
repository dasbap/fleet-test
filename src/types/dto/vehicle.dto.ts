/**
 * DTO persistance — aligné sur la table `vehicules` (snake_case).
 * Le modèle domaine camelCase est dans `@/types/vehicle`.
 */

import type { VehicleStatus } from '@/domain/constants/vehicleStatus';

/** Aligné sur `vehicules.status` — alias DTO pour la couche persistance. */
export type VehicleStatusDto = VehicleStatus;

export interface VehicleActiveAssignmentDto {
  id: string;
  driver_user_id: string;
  driver?: {
    user_id: string;
    full_name: string | null;
  } | null;
}

export interface VehicleDto {
  id: string;
  fleet_id: string;
  registration: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  current_km: number;
  status: VehicleStatusDto;
  blocked_reason: string | null;
  created_at: string;
  active_assignment?: VehicleActiveAssignmentDto | null;
}

export interface VehicleInsertDto {
  fleet_id: string;
  subscription_id?: string;
  registration: string;
  brand?: string;
  model?: string;
  year?: number;
  current_km?: number;
}
