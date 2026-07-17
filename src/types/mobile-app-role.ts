/**
 * Rôles applicatifs V1 — mobile Flotte E-Samba (nomenclature métier).
 * Mappés vers {@link AppRole} via `mobileRoleBridge` (source de vérité persistée).
 *
 * Préférer ce type pour les libellés produit et les gardes d’UI en nomenclature SUPERVISOR / … ;
 * conserver {@link AppRole} au bord des services / persistance.
 * Pas d’alias `Role` ici (évite le conflit avec PlatformRole / FleetRole).
 */
export type MobileAppRole =
  | "SUPERVISOR"
  | "FLEET_MANAGER"
  | "MECHANIC"
  | "DRIVER";

export const MOBILE_APP_ROLE_LABELS: Record<MobileAppRole, string> = {
  SUPERVISOR: "Superviseur",
  FLEET_MANAGER: "Gestionnaire de flotte",
  MECHANIC: "Mécanicien",
  DRIVER: "Conducteur",
};

export const MOBILE_APP_ROLE_ORDER: MobileAppRole[] = [
  "SUPERVISOR",
  "FLEET_MANAGER",
  "MECHANIC",
  "DRIVER",
];
