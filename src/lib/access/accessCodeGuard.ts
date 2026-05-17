/**
 * Validation locale des codes d'accès E-Samba — fonctions pures sans réseau.
 *
 * La validation authoritative est côté serveur (RPC access_code_validate).
 * Ce module fournit des pré-validations côté client pour l'UX (format, longueur).
 */

import type { AccessCodeRoleTarget, AccessUniverse } from "@/types/access";

// ─── Format attendu ────────────────────────────────────────────────────────────
// Exemples valides :
//   SAMBA-INV-ABC-0042
//   SAMBA-PRO-XY1-9999
//   SAMBA-COM-DEF-0001

const ACCESS_CODE_REGEX = /^[A-Z]+-[A-Z0-9]+-[A-Z0-9]+-\d{4}$/;

// ─── Validation de format ─────────────────────────────────────────────────────

/**
 * Valide le format d'un code d'accès localement (sans réseau).
 * Retourne null si valide, sinon un message d'erreur en français.
 */
export function validateCodeFormat(raw: string): string | null {
  const code = raw.trim().toUpperCase();

  if (!code) {
    return "Veuillez saisir un code d'accès.";
  }

  if (code.length < 8) {
    return "Le code est trop court. Exemple : SAMBA-INV-ABC-0042";
  }

  if (code.length > 32) {
    return "Le code saisi est trop long. Vérifiez votre saisie.";
  }

  if (!ACCESS_CODE_REGEX.test(code)) {
    return "Format de code invalide. Exemple attendu : SAMBA-INV-ABC-0042";
  }

  return null;
}

/**
 * Normalise un code d'accès (majuscules + trim).
 */
export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase();
}

// ─── Détection du rôle depuis le préfixe ─────────────────────────────────────

/**
 * Déduit le rôle cible probable depuis le préfixe du code.
 * Utile pour afficher un label avant validation serveur.
 */
export function guessRoleFromCode(code: string): AccessCodeRoleTarget | null {
  const normalized = normalizeCode(code);
  if (normalized.startsWith("SAMBA-INV-")) return "investor";
  if (normalized.startsWith("SAMBA-PRO-")) return "prospect";
  if (normalized.startsWith("SAMBA-COM-")) return "commercial";
  if (normalized.startsWith("SAMBA-DEV-")) return "dev";
  return null;
}

/**
 * Déduit l'univers probable depuis le préfixe du code.
 */
export function guessUniverseFromCode(code: string): AccessUniverse | null {
  const role = guessRoleFromCode(code);
  if (!role) return null;
  if (role === "investor" || role === "prospect") return "temporary";
  if (role === "commercial" || role === "dev")    return "internal";
  return null;
}

// ─── Vérification d'expiration locale ────────────────────────────────────────

/**
 * Vérifie si un code est expiré côté client (basé sur expires_at retourné par l'API).
 */
export function isCodeExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() <= Date.now();
}

/**
 * Retourne le nombre de jours avant expiration d'un code.
 */
export function codeDaysRemaining(expiresAt: string): number {
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}

// ─── Vérification des droits de création ─────────────────────────────────────

/**
 * Vérifie si un rôle interne peut créer un code pour un rôle cible donné.
 * Un commercial ne peut créer que des codes investor/prospect.
 * Un dev peut créer investor/prospect uniquement (pas de codes internes).
 * Un admin peut tout créer sauf des codes admin.
 */
export function canCreateCode(
  creatorRole: "admin" | "dev" | "commercial",
  targetRole:  AccessCodeRoleTarget,
): { allowed: boolean; reason?: string } {
  if (targetRole === "commercial" || targetRole === "dev") {
    if (creatorRole !== "admin") {
      return {
        allowed: false,
        reason:  "Seul un administrateur peut créer des codes pour l'équipe interne.",
      };
    }
  }

  if (creatorRole === "commercial" && (targetRole === "commercial" || targetRole === "dev")) {
    return {
      allowed: false,
      reason:  "Un commercial ne peut créer que des codes pour investisseurs ou prospects.",
    };
  }

  return { allowed: true };
}

// ─── Messages UX ─────────────────────────────────────────────────────────────

/** Messages d'état du formulaire de saisie de code. */
export const CODE_INPUT_MESSAGES = {
  validating: "Vérification du code en cours…",
  consuming:  "Activation de votre accès…",
  success:    "Code validé ! Bienvenue sur E-Samba.",
  notFound:   "Code invalide. Vérifiez la saisie ou contactez votre commercial.",
  expired:    "Ce code a expiré. Contactez l'équipe E-Samba pour obtenir un nouveau code.",
  exhausted:  "Ce code a atteint son nombre maximum d'utilisations.",
  revoked:    "Ce code a été désactivé. Contactez l'équipe E-Samba.",
  alreadyUsed:"Vous avez déjà utilisé ce code d'accès.",
  networkError:"Une erreur réseau est survenue. Veuillez réessayer.",
} as const;

export type CodeInputMessageKey = keyof typeof CODE_INPUT_MESSAGES;
