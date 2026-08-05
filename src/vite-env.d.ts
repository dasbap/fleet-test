/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  /** DSN Sentry (optionnel) : si défini, les erreurs JS sont envoyées à Sentry. */
  readonly VITE_SENTRY_DSN?: string;
  /** URL publique du site (canonical, og:url). Défaut : https://www.e-samba.com */
  readonly VITE_APP_URL?: string;
  /** Version affichée / analytics ; en CI release, dérivée de package.json. */
  readonly VITE_APP_VERSION?: string;
  /** Session mockée locale (sans Supabase). Valeur attendue : "true". */
  readonly VITE_USE_MOCK_AUTH?: string;
  /** Active les acces et sessions demo hors build production. Valeur attendue : "true". */
  readonly VITE_ENABLE_DEMO_UI?: string;
  /** Mot de passe injecte uniquement pour les acces demo locaux/staging. */
  readonly VITE_DEMO_PASSWORD?: string;
  /** Mode E2E Playwright onboarding : expose le wizard mock avec orgId stable. */
  readonly VITE_E2E_ONBOARDING?: string;
  /** UUID organisation mockée pour les scénarios E2E onboarding. */
  readonly VITE_MOCK_ORG_ID?: string;
  /** Base URL du BFF (ex. `/api`). Voir src/lib/bff-config.ts */
  readonly VITE_API_BASE_URL?: string;
  /** `true` : proxy Vite vers le BFF en dev. */
  readonly VITE_DEV_BFF_PROXY?: string;
  /** UUID de la flotte démo (Table Editor → flottes) pour auth mock + appels API. */
  readonly VITE_DEMO_FLEET_ID?: string;
  /** Données démo pour le module Opérations (snapshots). Valeur attendue : "true". */
  readonly VITE_OPERATIONS_MOCK?: string;
  /** Fichier Protomaps PMTiles auto-heberge pour la carte de suivi live. */
  readonly VITE_PROTOMAPS_PM_TILES_URL?: string;
  /** URL raster XYZ de repli pour la carte de suivi live. */
  readonly VITE_MAP_TILE_URL?: string;
  /** Quota offline tutoriels en MB (ex: 250). */
  readonly VITE_TUTORIAL_OFFLINE_QUOTA_MB?: string;
  /** Nombre de tutoriels accessibles sur le plan Free (défaut : 3). */
  readonly VITE_TUTORIAL_QUOTA_FREE?: string;
  /** Nombre de tutoriels accessibles sur le plan Pro (défaut : 50). */
  readonly VITE_TUTORIAL_QUOTA_PRO?: string;
  /** Nombre de tutoriels accessibles sur le plan Enterprise (-1 = illimité). */
  readonly VITE_TUTORIAL_QUOTA_ENTERPRISE?: string;
  /** UUID flottes pilotes Expo terrain (séparés par virgule). */
  readonly VITE_TERRAIN_EXPO_FLEET_IDS?: string;
  /** "true" when native push can safely call Firebase-backed registration. */
  readonly VITE_NATIVE_PUSH_CONFIGURED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
