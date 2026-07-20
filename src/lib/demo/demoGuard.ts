/**
 * Contrôle d'accès démo — fonctions pures sans dépendance React.
 *
 * Utilisé par useDemoSession (hook) et demoMiddleware (BFF).
 * Pas d'import Supabase ici : ce module est indépendant du transport.
 */

// ─── Types ─────────────────────────────────────────────────────────────────

export type DemoRole = "organizer" | "manager" | "driver" | "mechanic";

export type DemoAction =
  | "create_vehicle"
  | "export_data"
  | "view_billing"
  | "invite_users"
  | "access_reports"
  | "modify_org";

export interface DemoPolicy {
  role:                 DemoRole;
  can_create_vehicles:  boolean;
  can_export_data:      boolean;
  can_view_billing:     boolean;
  can_invite_users:     boolean;
  can_access_reports:   boolean;
  can_modify_org:       boolean;
  max_session_hours:    number;
  max_total_days:       number;
}

export interface DemoSession {
  sessionId:        string;
  expiresAt:        string;       // ISO 8601
  fleetId:          string;
  demoRole:         DemoRole;
  policy:           DemoPolicy;
}

export interface DemoGuardResult {
  allowed: boolean;
  reason?: "demo_policy" | "session_expired" | "not_demo" | "unknown_action";
}

// ─── Routes BFF bloquées pour les comptes démo ─────────────────────────────
// Toute route préfixée par l'une de ces chaînes est refusée.

export const DEMO_BLOCKED_BFF_ROUTES: readonly string[] = [
  "/billing/",
  "/admin/",
  "/exports/",
  "/reports/export",
  "/webhooks/",
];

// ─── Routes frontend bloquées ──────────────────────────────────────────────
// Utilisé par le guard React Router pour rediriger les comptes démo.

export const DEMO_BLOCKED_FRONTEND_ROUTES: readonly string[] = [
  "/billing",
  "/admin",
  "/settings/organisation",
  "/exports",
];

// ─── Mapping action → clé de policy ───────────────────────────────────────

const ACTION_TO_POLICY: Record<DemoAction, keyof DemoPolicy> = {
  create_vehicle:  "can_create_vehicles",
  export_data:     "can_export_data",
  view_billing:    "can_view_billing",
  invite_users:    "can_invite_users",
  access_reports:  "can_access_reports",
  modify_org:      "can_modify_org",
};

// ─── Fonctions pures ────────────────────────────────────────────────────────

/**
 * Vérifie si une action est autorisée pour un compte démo donné.
 * Retourne always `{ allowed: true }` si la session est null (non-démo).
 */
export function demoCanPerform(
  session: DemoSession | null,
  action: DemoAction,
): DemoGuardResult {
  if (!session) return { allowed: true };

  if (isSessionExpired(session)) {
    return { allowed: false, reason: "session_expired" };
  }

  const policyKey = ACTION_TO_POLICY[action];
  if (!policyKey) {
    return { allowed: false, reason: "unknown_action" };
  }

  const allowed = session.policy[policyKey] as boolean;
  return { allowed, reason: allowed ? undefined : "demo_policy" };
}

/**
 * Retourne true si la session démo est expirée côté client.
 */
export function isSessionExpired(session: DemoSession): boolean {
  return new Date(session.expiresAt).getTime() <= Date.now();
}

/**
 * Calcule le nombre de minutes restantes avant expiration de session.
 */
export function sessionMinutesRemaining(session: DemoSession): number {
  const diff = new Date(session.expiresAt).getTime() - Date.now();
  return Math.max(0, Math.floor(diff / 60_000));
}

/**
 * Vérifie si une route BFF est bloquée pour les comptes démo.
 */
export function isDemoBffRouteBlocked(pathname: string): boolean {
  return DEMO_BLOCKED_BFF_ROUTES.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Vérifie si une route frontend est bloquée pour les comptes démo.
 */
export function isDemoFrontendRouteBlocked(pathname: string): boolean {
  return DEMO_BLOCKED_FRONTEND_ROUTES.some((prefix) =>
    pathname === prefix || pathname.startsWith(prefix + "/"),
  );
}

/**
 * Label lisible du rôle démo pour l'UI.
 */
export function demoRoleLabel(role: DemoRole): string {
  const labels: Record<DemoRole, string> = {
    organizer: "Organisateur",
    manager:   "Gestionnaire",
    driver:    "Conducteur",
    mechanic:  "Mécanicien",
  };
  return labels[role] ?? role;
}
