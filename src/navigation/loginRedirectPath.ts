import type { Location } from "react-router-dom";
import { isMockAuthEnabled } from "@/lib/authMode";
import { ROUTE_PATHS } from "@/navigation/routePaths";
import { appendNextToLoginPath, isAuthEntryPath } from "@/navigation/postLoginRedirect";

/**
 * Chemin de connexion lorsque l’utilisateur n’est pas authentifié :
 * session mockée → écran mobile-first ; sinon → flux Supabase (page /auth).
 */
export function getUnauthenticatedLoginPath(): string {
  return isMockAuthEnabled() ? ROUTE_PATHS.login : ROUTE_PATHS.auth;
}

/**
 * URL de connexion avec `?next=` lorsque la cible n’est pas déjà l’écran auth
 * (préserve pathname + search pour les liens profonds).
 */
export function getLoginPathPreservingReturn(
  location: Pick<Location, "pathname" | "search">,
): string {
  const base = getUnauthenticatedLoginPath();
  if (isAuthEntryPath(location.pathname)) return base;
  return appendNextToLoginPath(base, `${location.pathname}${location.search}`);
}
