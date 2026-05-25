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
  /** Fond WebView / transition native — vert marque (#00C853, aligné index.css et cap:assets). */
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
     * Écran de lancement plugin (@capacitor/splash-screen).
     * Couleurs volontairement distinctes :
     * - racine / android.backgroundColor (#00C853) : marque + splash système Android 12+ (icône centrée)
     * - backgroundColor ici (#0f0f0f) : même fond que l’UI web sombre (index.html, manifest PWA)
     * Ne pas passer en #00C853 sans revoir l’enchaînement visuel au cold start.
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
