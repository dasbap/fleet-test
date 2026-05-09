/**
 * Rôles applicatifs V1 — mobile Flotte E-Samba (nomenclature métier).
 * Mappés vers {@link AppRole} pour compatibilité Supabase / memberships existants.
 *
 * Préférer ce type pour les libellés produit et les gardes d’UI en nomenclature SUPERVISOR / … ;
 * conserver {@link AppRole} au bord des services / persistance.
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

/** Alias produit : rôle métier affiché (équivalent {@link MobileAppRole}). */
export type Role = MobileAppRole;
