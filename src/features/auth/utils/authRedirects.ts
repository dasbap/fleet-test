import { ESAMBA_DEEP_LINK_PREFIX } from "@/lib/deepLinks/deepLinkConfig";
import { isNativePlatform } from "@/lib/platform";

/**
 * Centralise la construction des URLs de redirection Supabase Auth.
 *
 * - Web : `VITE_APP_URL` si défini, sinon `window.location.origin`.
 * - Natif (Capacitor) : `esamba://` + chemin (ex. `auth/callback`) pour ouvrir l’app
 *   depuis l’email ; à autoriser aussi dans Supabase → Redirect URLs.
 *
 * Build mobile : définir `VITE_APP_URL=https://www.e-samba.com` dans `.env.local` pour
 * les flux qui doivent passer par le domaine public (App Links) au lieu du schéma custom.
 *
 * Ne jamais hardcoder les URLs dans les appels resetPasswordForEmail / signInWithOtp.
 */
export function getAuthRedirectUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;

  if (isNativePlatform()) {
    const usePublicWebRedirects =
      (import.meta.env.VITE_AUTH_MOBILE_USE_WEB_REDIRECTS as string | undefined) === "true";
    if (!usePublicWebRedirects) {
      return `${ESAMBA_DEEP_LINK_PREFIX}${normalizedPath}`;
    }
  }

  const base =
    (import.meta.env.VITE_APP_URL as string | undefined)?.replace(/\/$/, "") ??
    window.location.origin;

  const spaPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${spaPath}`;
}
