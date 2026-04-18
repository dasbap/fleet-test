import { ROUTE_PATHS } from "@/navigation/routePaths";

/** Paramètre d’URL pour la cible après connexion (chemins internes uniquement). */
export const POST_LOGIN_NEXT_PARAM = "next";

/** Ancien nom utilisé par `LoginPage` (mode mock) — encore accepté en lecture. */
export const LEGACY_POST_LOGIN_REDIRECT_PARAM = "redirect";

const MAX_NEXT_LEN = 2048;

/**
 * Indique si le chemin courant ne doit pas être réinjecté comme `next`
 * (évite une boucle /auth → /auth).
 */
export function isAuthEntryPath(pathname: string): boolean {
  return (
    pathname === ROUTE_PATHS.auth ||
    pathname === ROUTE_PATHS.login ||
    pathname.startsWith(`${ROUTE_PATHS.auth}/`) ||
    pathname.startsWith(`${ROUTE_PATHS.login}/`)
  );
}

/**
 * Valide une cible post-login : chemin relatif interne, sans open redirect.
 * Retourne la chaîne prête pour `navigate()` ou `null` si invalide.
 */
export function getSafePostLoginPath(raw: string | null | undefined): string | null {
  if (raw == null || typeof raw !== "string") return null;
  let s = raw.trim();
  if (!s) return null;
  try {
    s = decodeURIComponent(s);
  } catch {
    return null;
  }
  if (s.length > MAX_NEXT_LEN) return null;
  if (!s.startsWith("/") || s.startsWith("//")) return null;
  if (s.includes("\\") || /\s/.test(s)) return null;
  const beforeQuery = s.split("?")[0] ?? "";
  const pathOnly = beforeQuery.split("#")[0] ?? "";
  if (pathOnly.includes(":")) return null;
  if (isAuthEntryPath(pathOnly)) return null;
  return s;
}

/**
 * Construit l’URL de connexion avec `?next=` (ou `&next=` si la base a déjà des query params).
 */
export function appendNextToLoginPath(loginPath: string, returnPath: string): string {
  const safe = getSafePostLoginPath(returnPath);
  if (!safe) return loginPath;
  const sep = loginPath.includes("?") ? "&" : "?";
  return `${loginPath}${sep}${POST_LOGIN_NEXT_PARAM}=${encodeURIComponent(safe)}`;
}
