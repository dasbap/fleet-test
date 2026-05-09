# E-Samba — Smart Fleet Africa

Application web de gestion intelligente de flotte en Afrique Centrale. Suivi des véhicules, gestion des entretiens, alertes automatisées et supervision des opérations quotidiennes.

## Prérequis

- Node.js **22** ou supérieur (voir `engines` dans `package.json` ; requis notamment pour Capacitor CLI 8.x)
- npm

Fichiers de version : [`.node-version`](.node-version) et [`.nvmrc`](.nvmrc) (ex. `nvm install` puis `nvm use`, ou équivalent **fnm** / **asdf**). Si `npm install` affiche **EBADENGINE**, votre shell n’est pas en Node 22 : alignez la version locale pour coller à la CI et supprimer l’avertissement.

**CI (GitHub Actions)** : les jobs qui installent les dépendances npm utilisent `actions/setup-node` en **Node 22** (voir [`.github/workflows/`](.github/workflows/)). Les workflows qui ne font que du shell (ex. contrôle de nommage des migrations) n’ont pas besoin de Node pour `npm install`.

**Local (avant `npm install`)** : `node -v` doit afficher **v22.x**. Sinon : **fnm** (`fnm install` puis `fnm use`, lit `.node-version`), **nvm** (`nvm install` puis `nvm use`, lit `.nvmrc`), ou sous **Windows** : installateur officiel Node 22 LTS ou **nvm-windows** (`nvm install 22` puis `nvm use 22`). Le fichier [`.npmrc`](.npmrc) contient `engine-strict=true` : une version Node incompatible fait **échouer** l’installation.

[Installation de Node.js avec nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

## Démarrage (web)

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

### Convention de nommage des migrations

- Format obligatoire pour les nouvelles migrations : `YYYYMMDDHHMMSS_description.sql`
- Exemple : `20260410170000_fix_vehicles_search_view_order.sql`
- Pourquoi : évite les ambiguïtés de tri et garantit un ordre d'exécution stable
- Contrôle automatique : workflow GitHub `Supabase Migrations Replay` (replay sur environnement propre avant merge)

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
- `npm run build:analyze` — build avec génération d’un rapport treemap des bundles (`dist/stats.html`, équivalent à webpack-bundle-analyzer pour Vite/Rollup)
- `npm run analyze:visual` — alias de `build:analyze` (ouvrir `dist/stats.html` dans le navigateur après build)
- `npm run analyze:bundle` — build + tailles des chunks + contrôle du budget JS initial (`report:chunks`, `check:bundle-budget`)
- `npm run preview` — prévisualisation du build
- `npm run init:env` — crée `.env.local` depuis `.env.example` (à faire une fois)
- `npm run check:supabase` — vérifie la présence et la cohérence de la config Supabase (`.env.local`, client)
- `npm run verify:connection` — teste la connexion API Supabase (table `organisations`)
- `npm run check:backend` — vérifie tables, RPC et hooks backend
- `npm run lint` — lint ESLint
- `npm run test` — tests unitaires
- `npm run test:integration` — tests d’intégration
- `npm run build:capacitor` — build web avec chemins relatifs (`base: './'`) pour Capacitor
- `npm run cap:doctor` — diagnostic Node/Capacitor (explique pourquoi `npx cap sync` peut échouer)
- `npm run cap:sync` — synchronise Capacitor (Android/iOS) avec un runtime Node 22 isolé
- `npm run mobile:prepare` — `build:capacitor` puis `cap:sync` (met à jour `android/` et `ios/`)
- `npm run cap:assets` — régénère icônes et splash natifs à partir de `assets/logo.svg` (@capacitor/assets)
- `npm run store:screenshots` — génère les visuels type captures boutique dans `store-assets/`

### App mobile (Capacitor)

Pour préparer l’app mobile (Android/iOS) :

- `npm run build:capacitor` — build web avec `base: './'` (dossier `dist/` utilisé par Capacitor)
- `npm run cap:sync` — synchronise les projets natifs (`android/`, `ios/`) avec ce build
- `npm run mobile:prepare` — `build:capacitor` puis `cap:sync` (à lancer avant une compilation Android/iOS)
- `npm run android:assemble-release` — génère l’APK release (`android/app/build/outputs/apk/release/app-release.apk`). Nécessite le SDK Android : définir `ANDROID_HOME` ou `ANDROID_SDK_ROOT`, ou copier [`android/local.properties.example`](android/local.properties.example) vers `android/local.properties` en renseignant `sdk.dir`
- `npm run android:bundle` — exécute `mobile:prepare` puis génère l’AAB release pour Google Play (`android/app/build/outputs/bundle/release/app-release.aab`). Mêmes prérequis SDK ; signature release via `android/keystore.properties` (voir [`docs/publication-stores.md`](docs/publication-stores.md))

Si `npx cap sync` échoue avec `The Capacitor CLI requires NodeJS >=22.0.0`, lancez d’abord `npm run cap:doctor`, puis utilisez `npm run cap:sync` (commande recommandée du projet).

#### QA sur appareils réels (ADB, mémoire, réseau lent)

- **Parcours métier à valider** : connexion → liste véhicules / flotte mobile → formulaire de déclaration d’incident (`/dashboard/incidents/declare`). Vérifier le `.env` utilisé au `build:capacitor` (backend Supabase embarqué).
- **Installation USB** : `adb install -r chemin/vers/app-release.apk` (plusieurs appareils : `adb -s <serial> install -r …`). La commande `adb` se trouve dans `platform-tools` du SDK Android — ajoutez ce dossier au `PATH` si besoin. Sur **Xiaomi / Redmi**, activer si besoin l’installation via USB dans les options développeur.
- **Mémoire** : Android Studio → **View → Tool Windows → Profiler** sur le processus `com.esamba.flotte` (l’ancien *Device Monitor* n’est plus supporté). Pour la WebView : navigateur Chrome sur le PC → `chrome://inspect#devices` → inspecter la WebView Capacitor.
- **Réseau type 3G** : avec débogage USB, inspecter la WebView → onglet **Network** → profil **Slow 3G** (ou tester la PWA dans Chrome desktop avec throttling pour comparaison).

#### Structure mobile actuelle (routes + layout)

- Point d’entrée des routes app : `src/app/routes/app.routes.tsx`
- Groupe dashboard (web + mobile) : `src/app/routes/dashboard.routes.tsx`
- Layout mobile sous Capacitor : `src/layouts/MobileLayout.tsx` (activé via `src/components/dashboard/DashboardLayout.tsx`)
- Écrans mobile principaux :
  - `src/features/home/screens/MobileHomePage.tsx`
  - `src/features/fleet/screens/MobileFleetPage.tsx`
  - `src/features/fleet/screens/MobileDriverFleetPage.tsx`
  - `src/features/alerts/screens/MobileAlertsPage.tsx`
  - `src/features/operations/screens/MobileOperationsPage.tsx`
  - `src/features/account/screens/MobileAccountPage.tsx`
- Onglets + chemins centralisés : `src/navigation/mobileTabs.ts`, `src/navigation/routePaths.ts`
- Guards d’accès : `src/navigation/guards/RequireAuth.tsx`, `src/navigation/guards/RequireRole.tsx`

Sur **Windows**, exécuter `npm run mobile:prepare` (voir la liste ci-dessus), puis versionner le dossier `ios/` si besoin. La compilation, l’ouverture dans Xcode et l’exécution sur simulateur ou iPhone nécessitent **macOS + Xcode** : `npm run cap:open:ios` puis *Product → Run*.

### Validation visuelle des assets

Après un build synchronisé (`npm run mobile:prepare`, ou régénération des icônes / splash avec `npm run cap:assets` puis `npm run cap:sync`) :

- **Android** : `npm run cap:open:android`, lancer l’app sur un émulateur ou un appareil USB. Vérifier l’écran de lancement (splash) et l’icône dans le lanceur. Sous **Android 12+**, le splash système peut se limiter à une **icône centrée** sur fond coloré.
- **iOS** : sur **macOS**, `npm run cap:open:ios`, puis exécuter sur simulateur ou iPhone. Vérifier le splash au démarrage à froid et l’icône sur l’écran d’accueil.

**Captures pour les fiches magasin** (placeholders générés) : dossier `store-assets/` ; régénération : `npm run store:screenshots`.

**iOS — configuration dans le dépôt**

- **Push (APNs)** : `AppDelegate.swift` relaie le token vers `@capacitor/push-notifications` ; entitlements versionnés `ios/App/App/App.debug.entitlements` (`aps-environment` = development) et `App.release.entitlements` (production). Dans Xcode, confirmer **Signing & Capabilities** → **Push Notifications** pour l’App ID `com.esamba.flotte`. `Info.plist` : `UIBackgroundModes` → `remote-notification`.
- **Permissions usage** : clés `NS*` (caméra, photothèque, position) dans `ios/App/App/Info.plist` ; voir aussi `capacitor.config.ts` (plugin Push).
- **Confidentialité (App Store)** : `ios/App/App/PrivacyInfo.xcprivacy` (API UserDefaults / raison CA92.1). Aligner les déclarations App Store Connect (nutrition labels) avec la réalité du produit.
- **Export compliance** : `ITSAppUsesNonExemptEncryption` = false dans `Info.plist` tant que l’app n’utilise que le chiffrement standard (ex. TLS) — cohérent avec le questionnaire App Store Connect.

**Avant soumission / TestFlight**

1. Compte développeur Apple, certificats et profil de distribution ; capacité Push activée pour l’App ID.
2. Archiver en **Release** (entitlements **production** pour les builds store / TestFlight).
3. *Product → Archive* puis **Validate App** avant l’upload vers App Store Connect.
4. Captures d’écran, textes boutique, classification d’âge — à compléter dans App Store Connect.


Si votre terminal local est en Node 20, les scripts `cap:*` du projet utilisent automatiquement un runtime Node 22 pour la CLI Capacitor, afin d’éviter l’erreur `The Capacitor CLI requires NodeJS >=22.0.0`.

## Performance et CLS (Cumulative Layout Shift)

Le projet applique des mesures pour limiter le layout shift post-hydratation (polices, couleurs, images).

### Bonnes pratiques en place

- **Polices** : Poppins auto-hebergee en local via `public/fonts` + `src/styles/globals.css` (`font-display: swap`) ; pas d’`@import` ni de Google Fonts dans `index.html` pour limiter les dependances externes et le chargement tardif.
- **Thème** : classe `dark` et styles critiques (couleur de fond, texte) injectés dès le premier paint dans `index.html` pour éviter un flash puis un shift.
- **Images** : `width`/`height` ou conteneur avec `aspect-ratio` sur les `<img>` et zones d’aperçu pour réserver l’espace avant chargement (HeroSection, EvidencePreviewCard, EvidenceGrid, ProofUpload).
- **Styles post-hydratation** : éviter d’appliquer des classes ou couleurs dans un `useEffect` sans réserver l’espace au premier rendu ; privilégier des classes appliquées dès le premier rendu.

### Mesure du CLS

- **Chrome DevTools** : onglet Performance, enregistrer un chargement, puis « Experience » → métrique Cumulative Layout Shift.
- **PageSpeed Insights** : [https://pagespeed.web.dev/](https://pagespeed.web.dev/) — rapport Core Web Vitals dont le CLS.
- **En production** : intégrer `web-vitals` (ou équivalent) pour remonter le CLS réel des utilisateurs.

## Évolution du thème

L’application utilise actuellement un **thème sombre forcé** (voir [ADR 0001 — Thème sombre forcé](docs/adr/0001-forced-theme-dark.md)). Pour un passage futur à un thème sélectionnable par l’utilisateur (light/dark/système), consulter la section « Notes techniques (si réactivation d’un switch thème) » de l’ADR et les commentaires dans `src/index.css`.

## Référence offline

Les snippets couvrent bien les besoins offline (queue, statut, reprise de sync), mais il faut utiliser les primitives réelles du projet : `OfflineQueueService` et `useOfflineSyncStatus` (pas `syncQueue` / `useSyncQueue`).
Respectez l’architecture `composants → hooks → services → repositories` et documentez uniquement les chemins/API existants pour éviter une fausse couche parallèle.

## SEO (canonical et métas)

SPA sans SSR/SSG : le HTML initial contient titre, description, canonical et balises OG pour la home (`index.html`) ; au build, un HTML par route listée dans `src/lib/site.ts` est généré avec les métas correctes, et les rewrites Vercel servent ce fichier. Côté client, `PageSEO` met à jour canonical, title, description et og:url à chaque changement de route. Détail et checklist : [docs/seo.md](docs/seo.md).
