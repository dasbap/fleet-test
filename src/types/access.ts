/**
 * Types système d'accès E-Samba — univers, codes, rôles internes.
 *
 * Trois univers strictement isolés :
 *   internal   = équipe E-Samba (admin, dev, commercial)
 *   temporary  = comptes temporaires (prospects, investisseurs)
 *   real       = comptes clients réels (chauffeurs, gestionnaires, etc.)
 */

// ─── Univers d'accès ──────────────────────────────────────────────────────────

export type AccessUniverse = "internal" | "temporary" | "real";

/** Labels FR des univers (affichage UI). */
export const ACCESS_UNIVERSE_LABELS: Record<AccessUniverse, string> = {
  internal:  "Équipe interne",
  temporary: "Accès temporaire",
  real:      "Client réel",
} as const;

// ─── Rôles internes ───────────────────────────────────────────────────────────

/** Rôles des membres de l'équipe E-Samba (univers internal). */
export type InternalRole = "admin" | "dev" | "commercial";

export const INTERNAL_ROLE_LABELS: Record<InternalRole, string> = {
  admin:      "Administrateur",
  dev:        "Développeur",
  commercial: "Commercial",
} as const;

/** Permissions par rôle interne. */
export const INTERNAL_ROLE_PERMISSIONS: Record<InternalRole, {
  canCreateDemoAccess: boolean;   // créer des codes/accès démo et prospect
  canCreateInternalCode: boolean; // créer des codes pour dev/commercial
  canRevokeCode: boolean;         // révoquer un code d'accès
  canViewAllFleets: boolean;      // voir toutes les flottes (réelles + démo)
  canManageAdmins: boolean;       // gérer les profils admin_profiles
}> = {
  admin: {
    canCreateDemoAccess:    true,
    canCreateInternalCode:  true,
    canRevokeCode:          true,
    canViewAllFleets:       true,
    canManageAdmins:        true,
  },
  dev: {
    canCreateDemoAccess:    true,
    canCreateInternalCode:  false,
    canRevokeCode:          true,
    canViewAllFleets:       true,
    canManageAdmins:        false,
  },
  commercial: {
    canCreateDemoAccess:    true,
    canCreateInternalCode:  false,
    canRevokeCode:          false,
    canViewAllFleets:       false,
    canManageAdmins:        false,
  },
} as const;

// ─── Rôles temporaires ────────────────────────────────────────────────────────

/** Rôles des comptes temporaires (univers temporary). */
export type TemporaryRole = "prospect" | "investor";

export const TEMPORARY_ROLE_LABELS: Record<TemporaryRole, string> = {
  prospect: "Prospect (essai 7 jours)",
  investor: "Investisseur (lecture seule)",
} as const;

/** Droits des comptes temporaires. */
export const TEMPORARY_ROLE_PERMISSIONS: Record<TemporaryRole, {
  readOnly: boolean;
  canCreateVehicles: boolean;
  canExportData: boolean;
  canInviteUsers: boolean;
  canViewBilling: boolean;
}> = {
  investor: {
    readOnly:          true,
    canCreateVehicles: false,
    canExportData:     false,
    canInviteUsers:    false,
    canViewBilling:    false,
  },
  prospect: {
    readOnly:          false,
    canCreateVehicles: true,
    canExportData:     false,
    canInviteUsers:    false,
    canViewBilling:    false,
  },
} as const;

// ─── Codes d'accès ────────────────────────────────────────────────────────────

/** Rôles pouvant être attribués via un code d'accès. */
export type AccessCodeRoleTarget = "investor" | "prospect" | "commercial" | "dev";

/** Un code d'accès tel que retourné par l'API. */
export interface AccessCode {
  id:           string;
  code:         string;           // ex: "SAMBA-INV-ABC1-0042"
  label:        string | null;    // étiquette commerciale
  universe:     AccessUniverse;
  role_target:  AccessCodeRoleTarget;
  max_uses:     number;
  used_count:   number;
  uses_remaining: number;
  access_days:  number;
  expires_at:   string;           // ISO 8601
  is_active:    boolean;
  last_used_at: string | null;
  created_at:   string;
  fleet_id:     string | null;
  created_by_email: string | null;
}

// ─── Validation d'un code ─────────────────────────────────────────────────────

/** Résultat de validation d'un code (RPC access_code_validate). */
export type AccessCodeValidationResult =
  | AccessCodeValidationSuccess
  | AccessCodeValidationFailure;

export interface AccessCodeValidationSuccess {
  valid:        true;
  code_id:      string;
  label:        string | null;
  universe:     AccessUniverse;
  role_target:  AccessCodeRoleTarget;
  access_days:  number;
  fleet_id:     string | null;
  uses_left:    number;
  expires_at:   string;
}

export interface AccessCodeValidationFailure {
  valid:    false;
  reason:
    | "code_not_found"
    | "code_revoked"
    | "code_expired"
    | "code_exhausted"
    | "already_used"
    | "admin_not_via_code"
    | "not_authorized"
    | "invalid_role_for_universe"
    | "commercial_cannot_create_internal"
    | "admin_code_forbidden";
  message:  string;   // toujours en français
}

/** Résultat de consommation d'un code (RPC access_code_consume). */
export type AccessCodeConsumeResult =
  | AccessCodeConsumeSuccess
  | AccessCodeValidationFailure;

export interface AccessCodeConsumeSuccess {
  valid:       true;
  user_id:     string;
  universe:    AccessUniverse;
  role_target: AccessCodeRoleTarget;
  fleet_id:    string | null;
  expires_at:  string;
  access_days: number;
}

/** Paramètres de création d'un code (RPC access_code_create). */
export interface AccessCodeCreateParams {
  universe:       AccessUniverse;
  role_target:    AccessCodeRoleTarget;
  label?:         string;
  max_uses?:      number;
  access_days?:   number;
  expires_in_days?: number;
  fleet_id?:      string;
}

/** Résultat de création d'un code. */
export type AccessCodeCreateResult =
  | { ok: true;  code_id: string; code: string; universe: AccessUniverse; role_target: string; max_uses: number; access_days: number; expires_at: string }
  | { ok: false; reason: string; message: string };

// ─── Contexte univers utilisateur ────────────────────────────────────────────

/** Contexte d'univers d'un utilisateur connecté. */
export interface UserUniverseContext {
  universe:     AccessUniverse;
  internalRole: InternalRole | null;    // null si non-internal
  temporaryRole: TemporaryRole | null;  // null si non-temporary
  expiresAt:    string | null;          // null si pas d'expiration
  isReadOnly:   boolean;                // investisseur = lecture seule
}
