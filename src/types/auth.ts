/**
 * Types d’authentification partagés (session Supabase ou mock).
 * Prépare le branchement futur sur OTP / autres backends.
 *
 * Alignement produit :
 * - Rôles persistés : ENUM Postgres `role_type` (+ extension éventuelle `visitor`).
 * - Plans : table `plans.code`.
 * - Capacités plan : RPC `get_fleet_billing_context` (voir `FleetBillingContext`).
 */

/** Rôles persistés côté adhésions flotte (ENUM `role_type`) — source de vérité applicative. */
export type AppRole = "organizer" | "manager" | "driver" | "mechanic";

/**
 * Rôle affiché / métier (inclut `visitor` pour UI ou rôles futurs non encore en base).
 * Pour la persistance, utiliser {@link AppRole}.
 */
export type UserRole = AppRole | "visitor";

export interface FleetMembership {
  id: string;
  fleet_id: string;
  role: AppRole;
  is_active: boolean;
}

/** Utilisateur applicatif (champs communs Supabase + mock). */
export interface AuthUser {
  id: string;
  email?: string;
  phone?: string;
  created_at?: string;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
}

// ─── Plans (table plans.code) ─────────────────────────────────────────────────

export type PlanCode = "free" | "starter" | "pro" | "organizer";

/** Capacités dérivées du plan (aligné RPC / `FleetBillingContext`). */
export interface PlanEnables {
  finance: boolean;
  ai: boolean;
  reports: boolean;
  driver_scoring: boolean;
  anomaly_insights: boolean;
}

/**
 * Contexte unifié (équivalent cible RPC `get_auth_context` — construit côté client
 * à partir de la session, du tenant actif et de `get_fleet_billing_context`).
 */
export interface AuthContext {
  user_id: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  fleet_id: string | null;
  fleet_name: string | null;
  org_id: string | null;
  plan_code: PlanCode;
  plan_active: boolean;
  plan_expired: boolean;
  enables: PlanEnables;
  /** `null` = illimité (aligné RPC : plafond ≥ seuil « illimité »). */
  max_vehicles: number | null;
}

// ─── État global du flux d’auth ───────────────────────────────────────────────

export type AuthFlowStatus =
  | "loading"
  | "unauthenticated"
  /** Première flotte / adhésion : {@link ROUTE_PATHS.tenantBootstrap}. */
  | "tenant_bootstrap"
  | "onboarding"
  | "terrain"
  | "maintenance"
  | "upgrade"
  | "dashboard";

/** Destinations stables du routeur (chemins absolus). */
export type AuthDestination =
  | "/auth"
  | "/start"
  | "/onboarding"
  | "/terrain"
  | "/maintenance"
  | "/upgrade"
  | "/dashboard";

/** Permissions dérivées rôle + plan (couche UI ; RLS reste la source serveur). */
export interface AuthFlowPermissions {
  viewDashboard: boolean;
  manageVehicles: boolean;
  manageAlerts: boolean;
  openCreneaux: boolean;
  manageMaintenance: boolean;
  viewReports: boolean;
  viewFinance: boolean;
  manageOrg: boolean;
  inviteMembers: boolean;
  useAI: boolean;
}

/** Aligné sur `computeAuthFlowDecision` dans `lib/auth-flow` (évite import circulaire). */
export type AuthFlowDecisionReason =
  | "auth_required"
  | "tenant_bootstrap"
  | "onboarding"
  | "lapsed_paid"
  | "role_driver"
  | "role_mechanic"
  | "default_next";

export interface AuthFlowDecisionSnapshot {
  path: string;
  reason: AuthFlowDecisionReason;
}

/** Résultat enrichi du hook `useAuthFlow` (décision de route + contexte produit). */
export interface UseAuthFlowReturn {
  status: AuthFlowStatus;
  context: AuthContext | null;
  isLoading: boolean;
  isFirstLogin: boolean;
  can: AuthFlowPermissions;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshContext: () => Promise<void>;
  error: string | null;
  /** Décision de navigation post-login (compat `PostLoginGate`). */
  decision: AuthFlowDecisionSnapshot | null;
  /** Prêt pour appliquer la décision (même logique qu’avant extension). */
  isReady: boolean;
}
