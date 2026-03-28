/**
 * Types d’authentification partagés (session Supabase ou mock).
 * Prépare le branchement futur sur OTP / autres backends.
 */

export type AppRole = "organizer" | "manager" | "driver" | "mechanic";

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
