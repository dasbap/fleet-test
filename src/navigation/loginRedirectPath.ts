import { isMockAuthEnabled } from "@/lib/authMode";
import { ROUTE_PATHS } from "@/navigation/routePaths";

/**
 * Chemin de connexion lorsque l’utilisateur n’est pas authentifié :
 * session mockée → écran mobile-first ; sinon → flux Supabase (page /auth).
 */
export function getUnauthenticatedLoginPath(): string {
  return isMockAuthEnabled() ? ROUTE_PATHS.login : ROUTE_PATHS.auth;
}
