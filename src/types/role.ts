/**
 * Types métier — rôles et permissions Flotte E-Samba.
 *
 * Source de vérité persistée : {@link AppRole} (`@/types/auth`).
 * `FleetRole` est un alias domaine (libellés / hiérarchie UI flotte).
 * Nomenclature mobile : {@link MobileAppRole} + bridge `mobileRoleBridge`.
 * Alias composants `Role` (= PlatformRole) : `@/config/permissions` uniquement.
 */

import type { AppRole } from "@/types/auth";

/** Rôle dans une flotte (autorisation métier) — alias de {@link AppRole}. */
export type FleetRole = AppRole;

/** Libellés affichables pour l’UI. */
export const FLEET_ROLE_LABELS: Record<FleetRole, string> = {
  organizer: "Organisateur",
  manager: "Gestionnaire",
  driver: "Chauffeur",
  mechanic: "Mécanicien",
};

/** Hiérarchie simple pour comparer des niveaux d’accès (plus petit index = plus de privilèges). */
export const FLEET_ROLE_PRIORITY: FleetRole[] = [
  "organizer",
  "manager",
  "mechanic",
  "driver",
];

export function fleetRoleAtLeast(
  userRole: FleetRole | null,
  minimum: FleetRole
): boolean {
  if (!userRole) return false;
  const u = FLEET_ROLE_PRIORITY.indexOf(userRole);
  const m = FLEET_ROLE_PRIORITY.indexOf(minimum);
  if (u === -1 || m === -1) return false;
  return u <= m;
}
