/** URL de base du site marketing (guides, solutions, fonctionnalités). */
const DEFAULT_MARKETING_BASE = "https://marketing.e-samba.com";

/**
 * Retourne l'origine du hub contenu (Phase A : sous-domaine dédié).
 * Phase B : peut pointer vers `https://www.e-samba.com` si rewrites actifs.
 */
export function getMarketingBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_MARKETING_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }
  return DEFAULT_MARKETING_BASE;
}

/** Construit une URL absolue vers une page marketing. */
export function getMarketingUrl(path: string): string {
  const base = getMarketingBaseUrl();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}
