import type { CapacitorConfig } from "@capacitor/core";

/**
 * Configuration Capacitor — Flotte E-Samba.
 * Toujours builder le front avec `npm run build:capacitor` avant `cap sync`
 * pour que `base: './'` (Vite) corresponde au chargement dans le WebView.
 */
const config: CapacitorConfig = {
  appId: "com.esamba.flotte",
  appName: "Flotte E-Samba",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
  ios: {
    contentInset: "automatic",
  },
  plugins: {
    /** Affichage des notifications en avant-plan (iOS) : badge, son, bannière. */
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    /** Préférences clé-valeur (@capacitor/preferences) — options par défaut suffisent en V1. */
    Preferences: {},
  },
  // Plugins npm : @capacitor/app (deep links), @capacitor/geolocation, etc. → `npx cap sync`.
  // Schéma personnalisé des liens profonds : `esamba://` (voir docs/deep-links-esamba.md).
};

export default config;
