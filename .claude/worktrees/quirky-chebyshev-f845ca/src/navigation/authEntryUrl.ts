import { ROUTE_PATHS } from "@/navigation/routePaths";

/** Paramètre d’URL pour le mode formulaire sur `/auth`. */
export const AUTH_URL_MODE_PARAM = "mode";

/** Valeur du paramètre `mode` pour l’inscription (aligné sur les liens existants). */
export const AUTH_URL_MODE_SIGNUP = "signup";

/**
 * Indique si l’URL courante correspond au formulaire d’inscription.
 * Réutilisable pour tout écran qui lie vers `/auth?mode=signup` en préservant `next`, etc.
 */
export function isAuthSignupMode(searchParams: URLSearchParams): boolean {
  return searchParams.get(AUTH_URL_MODE_PARAM) === AUTH_URL_MODE_SIGNUP;
}

/**
 * Construit un lien vers `/auth` en conservant les query existantes (`next`, `redirect`, etc.)
 * et en activant ou désactivant le mode inscription.
 */
export function buildAuthHref(searchParams: URLSearchParams, signup: boolean): string {
  const p = new URLSearchParams(searchParams);
  if (signup) {
    p.set(AUTH_URL_MODE_PARAM, AUTH_URL_MODE_SIGNUP);
  } else {
    p.delete(AUTH_URL_MODE_PARAM);
  }
  const q = p.toString();
  return q ? `${ROUTE_PATHS.auth}?${q}` : ROUTE_PATHS.auth;
}
