/**
 * URL de base du BFF (sans slash final). Si absente, les services utilisent Supabase côté client.
 * Exemples : `/api` (proxy Vite), `https://api.e-samba.com`.
 */
export function getBffBaseUrl(): string | undefined {
  const raw = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (!raw || typeof raw !== "string") return undefined;
  const t = raw.trim();
  return t.length ? t.replace(/\/$/, "") : undefined;
}
