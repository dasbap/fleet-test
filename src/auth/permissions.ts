/**
 * Autorisations par domaine fonctionnel (couche présentation).
 * Les rôles persistés restent {@link AppRole} ; l’UI métier peut utiliser {@link MobileAppRole}.
 * La sécurité réelle est assurée par Supabase RLS.
 */

import type { AppRole } from "@/types/auth";
import type { MobileAppRole } from "@/types/mobile-app-role";
import { mobileRoleToAppRole } from "@/lib/mobile/mobileRoleBridge";

/** Domaines applicatifs pour les contrôles d’accès UI. */
export type ModuleKey =
  | "finances"
  | "backoffice"
  | "collections"
  | "history_workshop"
  | "system_health"
  /** Création / édition véhicules (gestionnaires). */
  | "fleet_write"
  /** Bouton « Signaler un incident » sur la liste incidents (chauffeur + gestion). */
  | "incident_report"
  /** Créer une fiche maintenance depuis un incident (mécanicien + gestion). */
  | "incident_maintenance"
  /** Hub rôles : route réservée superviseur + gestionnaire de flotte. */
  | "roles_hub"
  /** Lien « Rôles » dans la sidebar web (superviseur uniquement, comportement historique). */
  | "roles_sidebar_link"
  /** Hub Opérations (missions, interventions, synthèses). */
  | "operations_hub"
  /** Détail mission (fiche opérationnelle). */
  | "operations_mission_detail"
  /** Détail intervention atelier (ticket maintenance). */
  | "operations_intervention_detail";

/**
 * Matrice : module → rôles autorisés (AppRole / persistance).
 */
export const MODULE_ACCESS: Record<ModuleKey, readonly AppRole[]> = {
  finances: ["organizer"],
  backoffice: ["organizer", "manager"],
  collections: ["organizer", "manager"],
  history_workshop: ["organizer", "manager", "mechanic"],
  system_health: ["organizer", "manager"],
  fleet_write: ["organizer", "manager"],
  incident_report: ["organizer", "manager", "driver"],
  incident_maintenance: ["organizer", "manager", "mechanic"],
  roles_hub: ["organizer", "manager"],
  roles_sidebar_link: ["organizer"],
  operations_hub: ["organizer", "manager", "driver", "mechanic"],
  operations_mission_detail: ["organizer", "manager", "driver"],
  operations_intervention_detail: ["organizer", "manager", "mechanic"],
};

/** Rôles autorisés pour les routes dashboard (alias de la matrice). */
export const DASHBOARD_FINANCES_ROLES = MODULE_ACCESS.finances;
export const DASHBOARD_BACKOFFICE_ROLES = MODULE_ACCESS.backoffice;
export const DASHBOARD_COLLECTIONS_ROLES = MODULE_ACCESS.collections;
export const DASHBOARD_HISTORY_ROLES = MODULE_ACCESS.history_workshop;
export const DASHBOARD_ROLES_HUB_ROLES = MODULE_ACCESS.roles_hub;

export function hasModuleAccess(
  role: AppRole | null | undefined,
  module: ModuleKey
): boolean {
  if (!role) return false;
  return (MODULE_ACCESS[module] as readonly AppRole[]).includes(role);
}

export function hasModuleAccessMobile(
  role: MobileAppRole | null | undefined,
  module: ModuleKey
): boolean {
  if (!role) return false;
  return hasModuleAccess(mobileRoleToAppRole(role), module);
}
