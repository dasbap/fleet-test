/**
 * Véhicule — modèle métier Flotte E-Samba (aligné conceptuellement sur la table `vehicules`).
 */
export type VehicleOperationalStatus = "ok" | "blocked" | "maintenance";

export interface Vehicle {
  id: string;
  fleetId: string;
  registration: string;
  label: string | null;
  brand: string | null;
  model: string | null;
  currentKm: number;
  status: VehicleOperationalStatus;
  blockedReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleSummary {
  id: string;
  registration: string;
  status: VehicleOperationalStatus;
  currentKm: number;
}
