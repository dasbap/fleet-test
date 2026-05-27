import { ESAMBA_DEEP_LINK_PREFIX, ESAMBA_DEEP_LINK_SCHEME } from "@/lib/deepLinks/deepLinkConfig";
import { ROUTE_PATHS } from "@/navigation/routePaths";

/** Hôtes HTTPS autorisés pour ouvrir l’app (App Links / Universal Links). */
export const APP_LINK_HOSTS = new Set(["www.e-samba.com", "e-samba.com"]);

/** Préfixes de chemins SPA autorisés (anti open-redirect). */
const ALLOWED_SPA_PATH_PREFIXES = [
  "/auth",
  "/dashboard",
  "/post-login",
  "/onboarding",
  "/start",
  "/terrain",
  "/maintenance",
  "/upgrade",
  "/login",
] as const;

export type ResolvedAppUrl =
  | { kind: "spa"; path: string }
  | { kind: "esamba_deep_link"; url: string }
  | { kind: "unsupported"; reason: string };

function isAllowedSpaPathname(pathname: string): boolean {
  return ALLOWED_SPA_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Chemins auth Supabase via schéma esamba:// (magic link, reset password, callback PKCE).
 */
export function tryParseEsambaAuthSpaPath(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed.startsWith(ESAMBA_DEEP_LINK_PREFIX)) {
    return null;
  }

  let pathPart = "";
  let search = "";
  let hash = "";

  try {
    const u = new URL(trimmed);
    if (u.protocol !== `${ESAMBA_DEEP_LINK_SCHEME}:`) {
      return null;
    }
    const host = u.hostname || "";
    const pathname = u.pathname.replace(/^\//, "");
    pathPart = [host, pathname].filter(Boolean).join("/");
    search = u.search;
    hash = u.hash;
  } catch {
    const withoutScheme = trimmed.slice(ESAMBA_DEEP_LINK_PREFIX.length);
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

  const normalized = pathPart.replace(/\/+$/, "");
  if (normalized === "auth/callback") {
    return `${ROUTE_PATHS.authCallback}${search}${hash}`;
  }
  if (normalized === "auth/update-password") {
    return `${ROUTE_PATHS.updatePassword}${search}${hash}`;
  }
  return null;
}

/**
 * Extrait un chemin SPA depuis une URL https://www.e-samba.com/…
 */
export function tryParseHttpsAppSpaPath(rawUrl: string): string | null {
  let u: URL;
  try {
    u = new URL(rawUrl.trim());
  } catch {
    return null;
  }

  if (u.protocol !== "https:" || !APP_LINK_HOSTS.has(u.hostname)) {
    return null;
  }

  const pathname = u.pathname || "/";
  if (!isAllowedSpaPathname(pathname)) {
    return null;
  }

  return `${pathname}${u.search}${u.hash}`;
}

/**
 * Résout une URL entrante (esamba://, https app, ou deep link métier esamba://alerts…).
 */
export function resolveIncomingAppUrl(rawUrl: string): ResolvedAppUrl {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { kind: "unsupported", reason: "URL vide" };
  }

  const authPath = tryParseEsambaAuthSpaPath(trimmed);
  if (authPath) {
    return { kind: "spa", path: authPath };
  }

  if (trimmed.startsWith("https://")) {
    const httpsPath = tryParseHttpsAppSpaPath(trimmed);
    if (httpsPath) {
      return { kind: "spa", path: httpsPath };
    }
    return { kind: "unsupported", reason: "Hôte ou chemin HTTPS non autorisé" };
  }

  if (trimmed.startsWith(ESAMBA_DEEP_LINK_PREFIX)) {
    return { kind: "esamba_deep_link", url: trimmed };
  }

  return { kind: "unsupported", reason: "Schéma non supporté" };
}
