/**
 * Liens légaux et support — routes internes par défaut,
 * surchargeables via variables d’environnement (Vite).
 */
export const ACCOUNT_EXTERNAL_LINKS = {
  /** Centre d’aide — route interne. Surcharger avec VITE_HELP_CENTER_URL pour domaine externe. */
  helpCenter:
    typeof import.meta.env.VITE_HELP_CENTER_URL === "string" &&
    import.meta.env.VITE_HELP_CENTER_URL.length > 1
      ? import.meta.env.VITE_HELP_CENTER_URL
      : "/help",
  /** Politique de confidentialité — route interne. */
  privacyPolicy:
    typeof import.meta.env.VITE_PRIVACY_POLICY_URL === "string" &&
    import.meta.env.VITE_PRIVACY_POLICY_URL.length > 1
      ? import.meta.env.VITE_PRIVACY_POLICY_URL
      : "/confidentialite",
  /** Conditions d’utilisation — route interne. */
  termsOfService:
    typeof import.meta.env.VITE_TERMS_URL === "string" &&
    import.meta.env.VITE_TERMS_URL.length > 1
      ? import.meta.env.VITE_TERMS_URL
      : "/conditions",
} as const;
