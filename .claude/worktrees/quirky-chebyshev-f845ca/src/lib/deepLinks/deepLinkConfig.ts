/**
 * Schéma personnalisé Flotte E-Samba (Capacitor + WebView).
 * Aligné sur la configuration Android (intent-filter) et iOS (CFBundleURLTypes).
 */

/** Schéma d’URL pour les liens profonds natifs (ex. esamba://alerts/…) */
export const ESAMBA_DEEP_LINK_SCHEME = "esamba" as const;

/** Préfixe complet pour construire des URLs de test */
export const ESAMBA_DEEP_LINK_PREFIX = `${ESAMBA_DEEP_LINK_SCHEME}://` as const;

/**
 * Événement DOM pour déclencher une navigation deep link hors du flux Capacitor
 * (ex. plugin push FCM/APNs une fois le WebView prêt).
 */
export const ESAMBA_DEEP_LINK_WINDOW_EVENT = "esamba-deep-link" as const;

export interface EsambaDeepLinkEventDetail {
  url: string;
}

/**
 * Navigation directe par chemin SPA (ex. payload push déjà résolu côté backend).
 */
export const ESAMBA_INTERNAL_PATH_WINDOW_EVENT = "esamba-internal-path" as const;

export interface EsambaInternalPathEventDetail {
  path: string;
}
