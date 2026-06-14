import type { AppRole, AuthFlowDecisionSnapshot, AuthFlowStatus } from "@/types/auth";
import { ROUTE_PATHS } from "@/navigation/routePaths";

/** Fenêtre de détection première connexion : created_at ≈ last_sign_in_at. */
export const AUTH_FLOW_FIRST_LOGIN_WINDOW_MS = 60_000;

/** Délai max d’attente org/flotte/billing avant navigation forcée (réseau lent). */
export const AUTH_FLOW_MAX_WAIT_MS = 4_000;

/** Délai max pour getSession / getUser / adhésions au démarrage (évite spinner infini). */
export const AUTH_INIT_TIMEOUT_MS = 15_000;

export type AuthFlowReason =
  | "auth_required"
  | "tenant_bootstrap"
  | "onboarding"
  | "lapsed_paid"
  | "role_driver"
  | "role_mechanic"
  | "default_next";

/**
 * Détecte une première connexion (compte créé et première session dans la même fenêtre temporelle).
 */
export function detectFirstLogin(
  createdAt: string | undefined,
  lastSignInAt: string | null | undefined,
  windowMs: number = AUTH_FLOW_FIRST_LOGIN_WINDOW_MS,
): boolean {
  if (!createdAt) return false;
  if (!lastSignInAt) return true;
  return (
    Math.abs(new Date(lastSignInAt).getTime() - new Date(createdAt).getTime()) < windowMs
  );
}

export interface AuthFlowComputeInput {
  /** Utilisateur authentifié présent. */
  hasUser: boolean;
  /** Au moins une adhésion flotte. */
  hasMemberships: boolean;
  userCreatedAt?: string;
  lastSignInAt?: string | null;
  /** Onboarding applicatif terminé pour l’org (false = wizard à faire). */
  onboardingCompleted: boolean;
  /** Abonnement payant historique non actif (à renouveler). */
  lapsedPaid: boolean;
  /** Rôle sur la flotte active. */
  role: AppRole | null;
  /**
   * Cible post-login déjà validée (ex. getSafePostLoginPath), jamais une entrée auth.
   * Si elle commence par /post-login, le calcul retombe sur le dashboard.
   */
  safeNextPath: string;
}

export interface AuthFlowComputeResult {
  path: string;
  reason: AuthFlowReason;
}

/**
 * Aiguillage post-authentification (ordre : adhésion → onboarding / 1ère connexion →
 * plan payant expiré → rôle driver → rôle mécano → next ou dashboard).
 * Prérequis si `hasMemberships` : contexte org/flotte actif déjà résolu côté appelant.
 *
 * Le wizard d’onboarding (véhicule, alertes…) n’est proposé qu’aux rôles pouvant
 * créer des véhicules côté RLS (`organizer`, `manager`) — les autres rôles suivent
 * l’aiguillage métier (terrain, maintenance…) même si `onboarding_progress` est incomplet.
 */
export function computeAuthFlowDecision(input: AuthFlowComputeInput): AuthFlowComputeResult {
  if (!input.hasUser) {
    return { path: ROUTE_PATHS.auth, reason: "auth_required" };
  }

  if (!input.hasMemberships) {
    return { path: ROUTE_PATHS.tenantBootstrap, reason: "tenant_bootstrap" };
  }

  const firstLogin = detectFirstLogin(input.userCreatedAt, input.lastSignInAt);
  const isFleetAdmin = input.role === "organizer" || input.role === "manager";
  if ((firstLogin || !input.onboardingCompleted) && isFleetAdmin) {
    return { path: ROUTE_PATHS.onboarding, reason: "onboarding" };
  }

  if (input.lapsedPaid) {
    return { path: ROUTE_PATHS.upgrade, reason: "lapsed_paid" };
  }

  if (input.role === "driver") {
    return { path: ROUTE_PATHS.terrain, reason: "role_driver" };
  }

  if (input.role === "mechanic") {
    return { path: ROUTE_PATHS.maintenanceRoot, reason: "role_mechanic" };
  }

  let next = input.safeNextPath;
  if (next.startsWith(ROUTE_PATHS.postLogin)) {
    next = ROUTE_PATHS.dashboard;
  }

  return { path: next, reason: "default_next" };
}

/**
 * Statut produit dérivé de l’état session + décision de route (post-login).
 */
export function deriveAuthFlowStatus(
  authLoading: boolean,
  tenantOrgLoading: boolean,
  isReady: boolean,
  hasUser: boolean,
  decision: AuthFlowComputeResult | null,
): AuthFlowStatus {
  if (authLoading || tenantOrgLoading) {
    return "loading";
  }
  if (!isReady) {
    return "loading";
  }
  if (!hasUser) {
    return "unauthenticated";
  }
  if (!decision) {
    return "loading";
  }

  switch (decision.path) {
    case ROUTE_PATHS.tenantBootstrap:
      return "tenant_bootstrap";
    case ROUTE_PATHS.onboarding:
      return "onboarding";
    case ROUTE_PATHS.terrain:
      return "terrain";
    case ROUTE_PATHS.maintenanceRoot:
      return "maintenance";
    case ROUTE_PATHS.upgrade:
      return "upgrade";
    default:
      return "dashboard";
  }
}

export function toAuthFlowDecisionSnapshot(
  result: AuthFlowComputeResult,
): AuthFlowDecisionSnapshot {
  return { path: result.path, reason: result.reason };
}
