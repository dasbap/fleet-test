import type { Vehicle } from "../vehicle";
import type { VehicleDto, VehicleInsertDto, VehicleStatusDto } from "../dto/vehicle.dto";

/**
 * Types API véhicules (shape base de données / Supabase).
 * Utilisés par hooks/services/repositories pour éviter les redéfinitions locales.
 */
export type VehicleApi = VehicleDto;
export type VehicleInsertApi = VehicleInsertDto;
export type VehicleStatusApi = VehicleStatusDto;

/**
 * Type domaine UI (camelCase) maintenu séparé.
 * La convergence se fait via des mappers dans les services quand nécessaire.
 */
export type VehicleDomain = Vehicle;
