/**
 * Types RBAC E-Samba — couche granulaire au-dessus de AppRole.
 *
 * AppRole  = rôle persisté dans flotte_adhesions (per-fleet)
 * PlatformRole = AppRole + "admin" (cross-fleet, non stocké dans flotte_adhesions)
 * Permission   = action fine pouvant être vérifiée côté client ET serveur
 */

import type { AppRole } from "./auth.js";

// ─── Rôle plateforme ─────────────────────────────────────────────────────────

/** Tous les rôles incluant admin plateforme (non stocké dans flotte_adhesions). */
export type PlatformRole = AppRole | "admin";

/** Hiérarchie des rôles du plus au moins privilégié. */
export const ROLE_HIERARCHY: readonly PlatformRole[] = [
  "admin",
  "organizer",
  "manager",
  "mechanic",
  "driver",
] as const;

// ─── Permissions ──────────────────────────────────────────────────────────────

/** Actions granulaires vérifiables côté client et côté serveur (via rbac_check_permission). */
export type Permission =
  // Flotte
  | "fleet.view"
  | "fleet.create"
  | "fleet.update"
  | "fleet.delete"
  // Véhicules
  | "vehicle.view"
  | "vehicle.read_by_subscription"
  | "vehicle.create"
  | "vehicle.update"
  | "vehicle.delete"
  | "vehicle.assign_driver"
  // Membres
  | "member.view"
  | "member.invite"
  | "member.remove"
  | "member.update_role"
  // Maintenance
  | "maintenance.view"
  | "maintenance.create"
  | "maintenance.update"
  | "maintenance.delete"
  // Affectations conducteurs
  | "assignment.view_own"
  | "assignment.view_all"
  | "assignment.manage"
  // Rapports
  | "report.view"
  | "report.export"
  // Facturation
  | "billing.view"
  | "billing.manage"
  // DVIR
  | "dvir.submit"
  | "dvir.view_all"
  // Organisation
  | "org.settings"
  | "org.manage"
  // Admin plateforme (jamais via compte démo)
  | "admin.access"
  | "admin.manage_users"
  | "admin.manage_all_fleets";

// ─── Résultat de vérification ────────────────────────────────────────────────

export interface RbacCheckResult {
  allowed: boolean;
  role: PlatformRole | null;
  reason:
    | "platform_admin"
    | "role_allowed"
    | "role_denied"
    | "no_fleet_access"
    | "demo_blocked"
    | "session_expired";
}

// ─── Contexte RBAC complet ────────────────────────────────────────────────────

export interface RbacContext {
  /** Rôle effectif sur la flotte active (null = pas de membership). */
  fleetRole:       AppRole | null;
  /** Rôle plateforme global. */
  platformRole:    PlatformRole | null;
  /** true si l'utilisateur est admin plateforme ET non-démo. */
  isAdmin:         boolean;
  /** true si l'utilisateur est l'unique super admin plateforme. */
  isSuperAdmin:    boolean;
  /** true si l'utilisateur est un compte démo. */
  isDemo:          boolean;
  /** Fleet IDs accessibles par l'utilisateur. */
  accessibleFleets: string[];
}
