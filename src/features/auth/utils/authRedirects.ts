/**
 * Centralise la construction des URLs de redirection Supabase Auth.
 *
 * Utilise VITE_APP_URL si défini, sinon window.location.origin.
 * Ne jamais hardcoder les URLs dans les appels resetPasswordForEmail / signInWithOtp.
 */
export function getAuthRedirectUrl(path: string): string {
  const base =
    (import.meta.env.VITE_APP_URL as string | undefined)?.replace(/\/$/, "") ??
    window.location.origin;

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}
