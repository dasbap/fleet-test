import { useAuth, type AppRole } from "@/hooks/useAuth";

/**
 * Indique si le rôle courant est parmi ceux autorisés.
 */
export function useHasRole(allowed: readonly AppRole[]): boolean {
  const { role } = useAuth();
  if (!role) return false;
  return allowed.includes(role);
}
