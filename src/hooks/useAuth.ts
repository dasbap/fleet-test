import { useAuthContext } from "@/hooks/useAuthContext";

export type { AppRole, FleetMembership } from "@/types/auth";
export type { AuthUser } from "@/types/auth";

/**
 * Session et rôle applicatif (Supabase ou mock selon VITE_USE_MOCK_AUTH).
 */
export function useAuth() {
  return useAuthContext();
}

export {
  requestPasswordReset,
  signIn,
  signOut,
  signUp,
  updateCurrentUserPassword,
} from "@/lib/auth-actions";
