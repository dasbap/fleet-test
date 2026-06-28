import type { NavigateFunction } from "react-router-dom";
import { ROUTE_PATHS } from "@/navigation/routePaths";
import { navigateFromAppUrl } from "@/lib/deepLinks/deepLinkNavigation";
import { ESAMBA_DEEP_LINK_SCHEME } from "@/lib/deepLinks/deepLinkConfig";

/** Schémas custom Android / iOS pour ouvrir l'app (Supabase redirect + push). */
export const MOBILE_DEEP_LINK_SCHEMES = [
  ESAMBA_DEEP_LINK_SCHEME,
  "com.esamba.flotte",
] as const;

/** Routes SPA critiques pour l'app Capacitor (auth, onboarding, dashboard). */
export const MOBILE_CRITICAL_ROUTES = {
  authCallback: ROUTE_PATHS.authCallback,
  updatePassword: ROUTE_PATHS.updatePassword,
  dashboard: ROUTE_PATHS.dashboard,
  onboarding: ROUTE_PATHS.onboarding,
  createFleet: ROUTE_PATHS.dashboardCreateFleet,
} as const;

/**
 * Alias host/path pour esamba:// et com.esamba.flotte://
 * (ex. esamba://auth/callback, com.esamba.flotte://dashboard).
 */
const MOBILE_SCHEME_PATH_ALIASES: Record<string, string> = {
  "auth/callback": MOBILE_CRITICAL_ROUTES.authCallback,
  "auth/update-password": MOBILE_CRITICAL_ROUTES.updatePassword,
  dashboard: MOBILE_CRITICAL_ROUTES.dashboard,
  onboarding: MOBILE_CRITICAL_ROUTES.onboarding,
  "create-fleet": MOBILE_CRITICAL_ROUTES.createFleet,
  "dashboard/create-fleet": MOBILE_CRITICAL_ROUTES.createFleet,
};

function isMobileCustomScheme(protocol: string): boolean {
  const scheme = protocol.replace(/:$/, "");
  return (MOBILE_DEEP_LINK_SCHEMES as readonly string[]).includes(scheme);
}

/**
 * Convertit esamba://… ou com.esamba.flotte://… en chemin SPA interne.
 * Retourne null si l'URL n'est pas un schéma mobile reconnu.
 */
export function tryParseMobileCustomSchemePath(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  let pathPart = "";
  let search = "";
  let hash = "";

  try {
    const u = new URL(trimmed);
    if (!isMobileCustomScheme(u.protocol)) {
      return null;
    }
    const host = u.hostname || "";
    const pathname = u.pathname.replace(/^\//, "");
    pathPart = [host, pathname].filter(Boolean).join("/");
    search = u.search;
    hash = u.hash;
  } catch {
    const schemeMatch = MOBILE_DEEP_LINK_SCHEMES.find((s) => trimmed.startsWith(`${s}://`));
    if (!schemeMatch) return null;

    const withoutScheme = trimmed.slice(`${schemeMatch}://`.length);
    const hashIndex = withoutScheme.indexOf("#");
    const beforeHash = hashIndex >= 0 ? withoutScheme.slice(0, hashIndex) : withoutScheme;
    hash = hashIndex >= 0 ? withoutScheme.slice(hashIndex) : "";
    const qIndex = beforeHash.indexOf("?");
    if (qIndex >= 0) {
      pathPart = beforeHash.slice(0, qIndex);
      search = `?${beforeHash.slice(qIndex + 1)}`;
    } else {
      pathPart = beforeHash;
    }
  }

  const normalized = pathPart.replace(/\/+$/, "").toLowerCase();
  const basePath = MOBILE_SCHEME_PATH_ALIASES[normalized];
  if (!basePath) {
    return null;
  }

  return `${basePath}${search}${hash}`;
}

/**
 * Point d'entrée mobile : résout l'URL entrante (custom scheme ou App Link) puis navigue.
 */
export function handleMobileDeepLink(
  rawUrl: string,
  navigate: NavigateFunction,
  options?: { replace?: boolean },
) {
  return navigateFromAppUrl(rawUrl, navigate, options);
}
