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
  /** UUID de la flotte démo (Table Editor → flottes) pour auth mock + appels API. */
  readonly VITE_DEMO_FLEET_ID?: string;
  /** Données démo pour le module Opérations (snapshots). Valeur attendue : "true". */
  readonly VITE_OPERATIONS_MOCK?: string;
  /** Token public Mapbox pour la carte de suivi live. */
  readonly VITE_MAPBOX_TOKEN?: string;
  /** Quota offline tutoriels en MB (ex: 250). */
  readonly VITE_TUTORIAL_OFFLINE_QUOTA_MB?: string;
  /** Nombre de tutoriels accessibles sur le plan Free (défaut : 3). */
  readonly VITE_TUTORIAL_QUOTA_FREE?: string;
  /** Nombre de tutoriels accessibles sur le plan Pro (défaut : 50). */
  readonly VITE_TUTORIAL_QUOTA_PRO?: string;
  /** Nombre de tutoriels accessibles sur le plan Enterprise (-1 = illimité). */
  readonly VITE_TUTORIAL_QUOTA_ENTERPRISE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}