/**
 * Isolation entre univers d'accès E-Samba — fonctions pures sans dépendance React.
 *
 * Règle fondamentale : internal / temporary / real ne se croisent jamais.
 *   - Un compte real ne voit pas les données démo (is_demo=true)
 *   - Un compte temporary ne voit pas les données réelles (is_demo=false)
 *   - Un compte internal voit tout (pour le support et le debug)
 *   - Un investisseur (temporary) est en lecture seule
 */

import type {
  AccessUniverse,
  InternalRole,
  TemporaryRole,
  UserUniverseContext,
} from "@/types/access";
import {
  ACCESS_UNIVERSE_LABELS,
  INTERNAL_ROLE_LABELS,
  INTERNAL_ROLE_PERMISSIONS,
  TEMPORARY_ROLE_LABELS,
  TEMPORARY_ROLE_PERMISSIONS,
} from "@/types/access";

// ─── Règle de croisement ──────────────────────────────────────────────────────

/**
 * Retourne true si un utilisateur d'un univers peut accéder aux données d'un autre univers.
 * La règle est stricte : seul l'univers internal peut croiser les autres.
 */
export function canUniversesCross(
  userUniverse: AccessUniverse,
  dataUniverse: "demo" | "real",
): boolean {
  if (userUniverse === "internal") return true;   // équipe interne voit tout

  if (userUniverse === "temporary") {
    return dataUniverse === "demo";               // temporaire → démo uniquement
  }

  // real
  return dataUniverse === "real";                 // réel → réel uniquement
}

/**
 * Vérifie si un utilisateur peut effectuer une écriture.
 * Les investisseurs sont toujours en lecture seule.
 */
export function canWrite(ctx: UserUniverseContext): boolean {
  return !ctx.isReadOnly;
}

// ─── Messages UX en français ──────────────────────────────────────────────────

/** Message affiché quand un compte real tente d'accéder à des données démo. */
export const MSG_REAL_BLOCKED_DEMO =
  "Cette section est réservée aux démonstrations. Votre compte client n'y a pas accès.";

/** Message affiché quand un compte temporary tente d'accéder à des données réelles. */
export const MSG_TEMPORARY_BLOCKED_REAL =
  "Votre accès de démonstration ne permet pas de voir les données clients réelles.";

/** Message affiché quand un investisseur tente une écriture. */
export const MSG_INVESTOR_READ_ONLY =
  "Votre compte investisseur est en lecture seule. Aucune modification n'est autorisée.";

/** Message affiché quand un commercial tente de créer un accès admin. */
export const MSG_COMMERCIAL_NO_ADMIN =
  "Les commerciaux ne peuvent pas créer de comptes administrateurs.";

/** Message affiché à l'expiration d'un compte temporaire. */
export const MSG_TEMPORARY_EXPIRED =
  "Votre accès temporaire a expiré. Contactez l'équipe E-Samba pour continuer.";

/**
 * Retourne le message d'erreur d'isolation adapté à la situation.
 */
export function getUniverseBlockMessage(
  userUniverse: AccessUniverse,
  dataUniverse: "demo" | "real",
): string {
  if (userUniverse === "real" && dataUniverse === "demo") {
    return MSG_REAL_BLOCKED_DEMO;
  }
  if (userUniverse === "temporary" && dataUniverse === "real") {
    return MSG_TEMPORARY_BLOCKED_REAL;
  }
  return "Accès refusé. Votre compte n'est pas autorisé à accéder à cette ressource.";
}

// ─── Labels et affichage ──────────────────────────────────────────────────────

/** Label FR de l'univers pour l'affichage. */
export function getUniverseLabel(universe: AccessUniverse): string {
  return ACCESS_UNIVERSE_LABELS[universe];
}

/** Label FR du rôle interne. */
export function getInternalRoleLabel(role: InternalRole): string {
  return INTERNAL_ROLE_LABELS[role];
}

/** Label FR du rôle temporaire. */
export function getTemporaryRoleLabel(role: TemporaryRole): string {
  return TEMPORARY_ROLE_LABELS[role];
}

/** Couleur CSS associée à chaque univers (classes Tailwind). */
export function getUniverseColorClass(universe: AccessUniverse): string {
  const map: Record<AccessUniverse, string> = {
    internal:  "text-purple-700 bg-purple-100",
    temporary: "text-amber-700 bg-amber-100",
    real:      "text-emerald-700 bg-emerald-100",
  };
  return map[universe];
}

// ─── Vérifications de permissions internes ────────────────────────────────────

/**
 * Vérifie si un rôle interne peut créer des accès démo/prospect.
 */
export function internalCanCreateDemoAccess(role: InternalRole): boolean {
  return INTERNAL_ROLE_PERMISSIONS[role].canCreateDemoAccess;
}

/**
 * Vérifie si un rôle interne peut révoquer des codes d'accès.
 */
export function internalCanRevokeCode(role: InternalRole): boolean {
  return INTERNAL_ROLE_PERMISSIONS[role].canRevokeCode;
}

/**
 * Vérifie si un rôle interne peut gérer les admins plateforme.
 */
export function internalCanManageAdmins(role: InternalRole): boolean {
  return INTERNAL_ROLE_PERMISSIONS[role].canManageAdmins;
}

// ─── Vérifications de permissions temporaires ─────────────────────────────────

/**
 * Vérifie si un compte temporaire est en lecture seule.
 */
export function temporaryIsReadOnly(role: TemporaryRole): boolean {
  return TEMPORARY_ROLE_PERMISSIONS[role].readOnly;
}

/**
 * Vérifie si un compte temporaire peut créer des véhicules (dans la flotte démo).
 */
export function temporaryCanCreateVehicle(role: TemporaryRole): boolean {
  return TEMPORARY_ROLE_PERMISSIONS[role].canCreateVehicles;
}

// ─── Expiration ───────────────────────────────────────────────────────────────

/**
 * Retourne true si un accès temporaire est expiré.
 */
export function isTemporaryAccessExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() <= Date.now();
}

/**
 * Retourne le nombre de jours restants pour un accès temporaire.
 * Retourne null si pas d'expiration.
 */
export function temporaryDaysRemaining(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}

/**
 * Construit un contexte univers depuis les données brutes de la session.
 */
export function buildUserUniverseContext(params: {
  internalRole:  InternalRole | null;
  temporaryRole: TemporaryRole | null;
  expiresAt:     string | null;
}): UserUniverseContext {
  const { internalRole, temporaryRole, expiresAt } = params;

  if (internalRole) {
    return {
      universe:      "internal",
      internalRole,
      temporaryRole: null,
      expiresAt:     null,
      isReadOnly:    false,
    };
  }

  if (temporaryRole) {
    return {
      universe:      "temporary",
      internalRole:  null,
      temporaryRole,
      expiresAt,
      isReadOnly:    temporaryIsReadOnly(temporaryRole),
    };
  }

  return {
    universe:      "real",
    internalRole:  null,
    temporaryRole: null,
    expiresAt:     null,
    isReadOnly:    false,
  };
}
