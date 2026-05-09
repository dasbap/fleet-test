import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Configuration Capacitor — Flotte E-Samba.
 * Toujours builder le front avec `npm run build:capacitor` avant `cap sync`
 * pour que `base: './'` (Vite) corresponde au chargement dans le WebView.
 */
const config: CapacitorConfig = {
  appId: "com.esamba.flotte",
  appName: "Flotte E-Samba",
  webDir: "dist",
  backgroundColor: "#00C853",
  server: {
    androidScheme: "https",
  },
  android: {
    path: "android",
    allowMixedContent: false,
    backgroundColor: "#00C853",
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
    /**
     * Écran de lancement natif (@capacitor/splash-screen) : masquage après chargement WebView.
     */
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#0f0f0f",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
  // Plugins npm : @capacitor/app (deep links), @capacitor/geolocation, etc. → `npx cap sync`.
  // Schéma personnalisé des liens profonds : `esamba://` (voir docs/deep-links-esamba.md).
};

export default config;
