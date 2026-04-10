import { useAuthContext } from "@/hooks/useAuthContext";

export type { AppRole, FleetMembership } from "@/types/auth";
export type { AuthUser } from "@/types/auth";

/**
 * Session et rôle applicatif (Supabase ou mock selon VITE_USE_MOCK_AUTH).
 */
export function useAuth() {
  return useAuthContext();
}

/* Les actions auth (signIn, signOut, etc.) sont importées depuis @/lib/auth-actions
 * pour ne pas lier vendor-supabase au module useAuth (routes publiques / landing). */
