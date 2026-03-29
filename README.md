# E-Samba — Smart Fleet Africa

Application web de gestion intelligente de flotte en Afrique Centrale. Suivi des véhicules, gestion des entretiens, alertes automatisées et supervision des opérations quotidiennes.

## Prérequis

- Node.js (LTS recommandé)
- npm

[Installation de Node.js avec nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

## Démarrage

```sh
# Cloner le dépôt
git clone <URL_DU_DEPOT>
cd smart-fleet-africa

# Installer les dépendances
npm i

# Configuration Supabase (local) : créer .env.local puis remplir URL et clé anon
npm run init:env
# Éditer .env.local avec vos valeurs (Settings → API sur app.supabase.com)
npm run check:supabase

# Lancer le serveur de développement
npm run dev
```

L’application est disponible sur `http://localhost:8080`.

## Comptes démo

Identifiants pour les utilisateurs de démo créés par `supabase/create-demo-organization-complete.sql` : [DEMO-CREDENTIALS.md](DEMO-CREDENTIALS.md) (mot de passe commun `Demo2025!`).

## Vérification de la connexion base de données

Procédure détaillée (env, check-supabase, verify:connection, check:backend, scripts SQL) : [docs/verification-connexion-bdd.md](docs/verification-connexion-bdd.md).

## Déploiement production (Vercel / e-samba.com)

Checklist : prévisualisations 401, variables `VITE_*`, auth Supabase, DNS et domaines — [docs/deployment-e-samba-vercel.md](docs/deployment-e-samba-vercel.md).

## Onboarding base de données (baseline + deltas)

- **Nouvel environnement** :
  1. Générer/valider la baseline de référence (`supabase/baseline/00000000000000_baseline_schema.sql`)
  2. Appliquer ensuite uniquement les deltas listés dans `supabase/baseline/delta-migrations.txt`
  3. Exécuter `npm run test:baseline-delta` pour vérifier le flux complet en local
- **Environnement existant** :
  1. Ne pas rejouer l'historique legacy
  2. Appliquer uniquement les deltas sécurité/RLS/search_path
- **Freeze de référence distant** : `npm run freeze:remote-schema` (exports dans `supabase/snapshots/`)

## Technologies

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase (backend / auth)

## Scripts disponibles

- `npm run dev` — serveur de développement
- `npm run build` — build de production
- `npm run preview` — prévisualisation du build
- `npm run init:env` — crée `.env.local` depuis `.env.example` (à faire une fois)
- `npm run check:supabase` — vérifie la présence et la cohérence de la config Supabase (`.env.local`, client)
- `npm run verify:connection` — teste la connexion API Supabase (table `organisations`)
- `npm run check:backend` — vérifie tables, RPC et hooks backend
- `npm run lint` — lint ESLint
- `npm run test` — tests unitaires
- `npm run test:integration` — tests d’intégration
- `npm run build:capacitor` — build web avec chemins relatifs (`base: './'`) pour Capacitor
- `npm run mobile:prepare` — `build:capacitor` puis `npx cap sync` (met à jour `android/` et `ios/`)

### App mobile iOS (Capacitor)

Sur **Windows**, préparer le dépôt avec `npm run mobile:prepare`, puis versionner le dossier `ios/`. La compilation, l’ouverture dans Xcode et l’exécution sur simulateur ou iPhone nécessitent **macOS + Xcode** : `npx cap open ios` puis *Product → Run*, ou `npx cap run ios`. Activer dans Xcode **Signing & Capabilities** la capacité **Push Notifications** ; `Info.plist` inclut `UIBackgroundModes` → `remote-notification` pour la réception en arrière-plan. Voir aussi `capacitor.config.ts` (plugin Push) et les clés `NS*` (caméra, galerie, position) dans `ios/App/App/Info.plist`.

## Performance et CLS (Cumulative Layout Shift)

Le projet applique des mesures pour limiter le layout shift post-hydratation (polices, couleurs, images).

### Bonnes pratiques en place

- **Polices** : preconnect + chargement des feuilles Google Fonts dans `index.html` avec `display=swap` ; pas d’`@import` dans le CSS pour éviter un chargement tardif. `font-heading` (Tailwind) aligné sur les polices réellement chargées (Poppins).
- **Thème** : classe `dark` et styles critiques (couleur de fond, texte) injectés dès le premier paint dans `index.html` pour éviter un flash puis un shift.
- **Images** : `width`/`height` ou conteneur avec `aspect-ratio` sur les `<img>` et zones d’aperçu pour réserver l’espace avant chargement (HeroSection, EvidencePreviewCard, EvidenceGrid, ProofUpload).
- **Styles post-hydratation** : éviter d’appliquer des classes ou couleurs dans un `useEffect` sans réserver l’espace au premier rendu ; privilégier des classes appliquées dès le premier rendu.

### Mesure du CLS

- **Chrome DevTools** : onglet Performance, enregistrer un chargement, puis « Experience » → métrique Cumulative Layout Shift.
- **PageSpeed Insights** : [https://pagespeed.web.dev/](https://pagespeed.web.dev/) — rapport Core Web Vitals dont le CLS.
- **En production** : intégrer `web-vitals` (ou équivalent) pour remonter le CLS réel des utilisateurs.

## Évolution du thème

L’application utilise actuellement un **thème sombre forcé** (voir [ADR 0001 — Thème sombre forcé](docs/adr/0001-forced-theme-dark.md)). Pour un passage futur à un thème sélectionnable par l’utilisateur (light/dark/système), consulter la section « Notes techniques (si réactivation d’un switch thème) » de l’ADR et les commentaires dans `src/index.css`.

## SEO (canonical et métas)

SPA sans SSR/SSG : le HTML initial contient titre, description, canonical et balises OG pour la home (`index.html`) ; au build, un HTML par route listée dans `src/lib/site.ts` est généré avec les métas correctes, et les rewrites Vercel servent ce fichier. Côté client, `PageSEO` met à jour canonical, title, description et og:url à chaque changement de route. Détail et checklist : [docs/seo.md](docs/seo.md).
