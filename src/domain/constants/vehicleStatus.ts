/** Statuts véhicule alignés sur la table `vehicules`. */
export const VEHICLE_STATUS_VALUES = ['ok', 'blocked'] as const;

export type VehicleStatus = (typeof VEHICLE_STATUS_VALUES)[number];

export const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  ok: 'Opérationnel',
  blocked: 'Bloqué',
};
