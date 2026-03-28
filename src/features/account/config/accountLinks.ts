/**
 * URLs externes — surcharger via variables d’environnement (Vite).
 * Si absentes, l’UI affiche un message « bientôt » ou ouvre une page placeholder.
 */
export const ACCOUNT_EXTERNAL_LINKS = {
  helpCenter:
    typeof import.meta.env.VITE_HELP_CENTER_URL === "string"
      ? import.meta.env.VITE_HELP_CENTER_URL
      : undefined,
  privacyPolicy:
    typeof import.meta.env.VITE_PRIVACY_POLICY_URL === "string"
      ? import.meta.env.VITE_PRIVACY_POLICY_URL
      : undefined,
} as const;
