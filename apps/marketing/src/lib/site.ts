/** URL du site marketing (build / déploiement). */
export const MARKETING_SITE_URL =
  import.meta.env.PUBLIC_SITE_URL?.trim() || "https://marketing.e-samba.com";

/** SPA produit E-Samba (CTA inscription, auth). */
export const APP_SITE_URL =
  import.meta.env.PUBLIC_APP_URL?.trim() || "https://www.e-samba.com";

export const SIGNUP_URL = `${APP_SITE_URL}/auth?mode=signup`;
export const AUTH_URL = `${APP_SITE_URL}/auth`;

export const OG_IMAGE = `${MARKETING_SITE_URL}/og-image.svg`;

export const PILLAR_LABELS = {
  ia: "Pilotage et analyses flotte",
  operations: "Guides opérationnels",
  performance: "Performance et conformité",
} as const;

export type PillarKey = keyof typeof PILLAR_LABELS;
