import { supabase } from "@/integrations/supabase/client";
import { clearBiometricLockStorage } from "@/services/biometric-lock.service";
import { clearPushTokenOnLogout } from "@/services/push-notification.service";
import type { AppRole, AuthUser, FleetMembership } from "@/types/auth";

export type EsambaRole = AppRole | "admin";

export interface AuthRequirementResult {
  ok: boolean;
  user: AuthUser | null;
}

export interface RoleRequirementResult {
  ok: boolean;
  user: AuthUser | null;
  role: EsambaRole | null;
}

export interface AuthProfile {
  user_id: string;
  full_name: string | null;
  phone: string | null;
}

const ROLE_PRIORITY: EsambaRole[] = [
  "admin",
  "organizer",
  "manager",
  "mechanic",
  "driver",
];

function highestRole(memberships: FleetMembership[]): EsambaRole | null {
  const roles = memberships.map((membership) => membership.role as EsambaRole);
  return ROLE_PRIORITY.find((role) => roles.includes(role)) ?? null;
}

function mapUser(user: Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"]): AuthUser | null {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    created_at: user.created_at,
    user_metadata: user.user_metadata ?? {},
    app_metadata: user.app_metadata ?? {},
  };
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return mapUser(user);
}

export async function getCurrentProfile(): Promise<AuthProfile | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profils")
    .select("user_id, full_name, phone")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error("Impossible de charger le profil utilisateur.");
  }

  if (!data) return null;
  return data as AuthProfile;
}

export async function getCurrentMemberships(): Promise<FleetMembership[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("flotte_adhesions")
    .select("id, fleet_id, role, is_active, created_at")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Impossible de charger les adhésions de flotte.");
  }

  return ((data ?? []) as FleetMembership[]).filter((row) => !!row.fleet_id);
}

export async function requireAuth(): Promise<AuthRequirementResult> {
  const user = await getCurrentUser();
  return { ok: !!user, user };
}

export async function requireRole(
  allowedRoles: readonly EsambaRole[],
): Promise<RoleRequirementResult> {
  const authResult = await requireAuth();
  if (!authResult.ok || !authResult.user) {
    return { ok: false, user: null, role: null };
  }

  const memberships = await getCurrentMemberships();
  const role = highestRole(memberships);
  const isAllowed = !!role && allowedRoles.includes(role);
  return { ok: isAllowed, user: authResult.user, role };
}

export async function signOut() {
  try {
    await clearBiometricLockStorage();
  } catch {
    // Non bloquant: la déconnexion Supabase doit continuer même si le nettoyage local échoue.
  }
  try {
    await clearPushTokenOnLogout();
  } catch {
    // Non bloquant : token push peut être absent ou déjà révoqué.
  }
  return supabase.auth.signOut();
}
