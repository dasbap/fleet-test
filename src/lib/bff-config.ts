/**
 * URL de base du BFF (sans slash final).
 * - `undefined` : pas de BFF, les services utilisent Supabase côté client.
 * - `""` : même origine (proxy Vite `VITE_DEV_BFF_PROXY=true`).
 * - `https://api.e-samba.com` : API dédiée en production.
 */
export function getBffBaseUrl(): string | undefined {
  const raw = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (typeof raw === "string" && raw.trim().length > 0) {
    return raw.trim().replace(/\/$/, "");
  }
  if (import.meta.env.VITE_DEV_BFF_PROXY === "true") {
    return "";
  }
  return undefined;
}

/** Indique si les appels HTTP vers le BFF sont activés (base définie, y compris chaîne vide). */
export function isBffConfigured(): boolean {
  return getBffBaseUrl() !== undefined;
}
