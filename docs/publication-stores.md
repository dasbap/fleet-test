# Publication Google Play et App Store Connect — Flotte E-Samba

Ce document décrit la configuration du dépôt pour produire des livrables store, les secrets GitHub Actions et les étapes manuelles côté consoles.

**Identifiant d’application** : `com.esamba.flotte` (voir [`capacitor.config.ts`](../capacitor.config.ts)).

## Checklist publication Play (étapes console)

Ordre suggéré pour aligner le plan local et la console Google :

1. **Compte développeur** : créer le compte [Google Play Console](https://play.google.com/console), payer la redevance unique (25 USD) et compléter le profil développeur.
2. **Signature release** : `npm run setup:android-keystore` (ou keystore manuel + `android/keystore.properties`) — ne jamais commiter le `.jks` ni les mots de passe.
3. **AAB** : `npm run android:bundle` — sortie attendue : `android/app/build/outputs/bundle/release/app-release.aab`.
4. **Créer l’application** dans la console (`com.esamba.flotte`) ; privilégier une **piste de test interne** pour le premier upload, puis promouvoir vers la production.
5. **Présentation sur le Play Store** : importer les visuels depuis `store-assets/google-play/` (`npm run store:screenshots`) — icône 512, graphique principal 1024×500, captures téléphone ; vérifier les dimensions affichées dans la console au moment de la soumission.
6. **Conformité** : URL de **politique de confidentialité**, formulaire **Sécurité des données**, **groupe de contenu** / cible d’âge, et autres questionnaires obligatoires jusqu’à ce que la fiche affiche « prêt à être examiné ».

## Prérequis communs

- Compte **Google Play Console** (accès à l’app ou création d’une fiche application).
- Compte **Apple Developer Program** et app enregistrée dans **App Store Connect**.
- Node.js 22+, dépendances installées (`npm ci`).

## Versions (source de vérité)

- Le champ **`version`** dans [`package.json`](../package.json) sert de **version marketing** (semver affichée aux utilisateurs).
- Le **numéro de build** natif (`versionCode` Android, `CURRENT_PROJECT_VERSION` iOS) doit **augmenter** à chaque upload store.

Commande pour aligner Android + iOS sur `package.json` :

```bash
npm run mobile:sync-version
```

- Sans option : le script **incrémente** le build par rapport à la valeur actuelle dans `android/app/build.gradle`.
- Build explicite (recommandé avant un upload App Store) :

```bash
npm run mobile:sync-version -- --build 42
```

## Google Play — génération du keystore et secrets GitHub

### Automatique (recommandé, Windows)

1. **JDK 17+** sur le PATH (ex. `winget install EclipseAdoptium.Temurin.17.JDK`) **ou** **Docker Desktop** démarré (le script utilisera l’image `eclipse-temurin:17-jdk-jammy` si `keytool` est absent).

2. Générer `android/upload-keystore.jks`, `android/keystore.properties` et un fichier d’aide local :

   ```bash
   npm run setup:android-keystore
   ```

3. **GitHub CLI** authentifiée (`gh auth login`) avec droits sur le dépôt, puis pousser les secrets attendus par le workflow :

   ```bash
   npm run secrets:github-android
   ```

   Cela définit `ANDROID_KEYSTORE_BASE64`, `ANDROID_STORE_PASSWORD`, `ANDROID_KEY_PASSWORD`, `ANDROID_KEY_ALIAS` sur le dépôt GitHub courant.

4. Supprimer localement `android/.github-android-secrets.local.txt` une fois les secrets en place (fichier déjà ignoré par Git).

5. Enchaîner avec la préparation du bundle et l’upload dans **Play Console** (étapes 3 à 5 de la section **Manuel** ci-dessous).

### Manuel

1. Créer un keystore (une fois) :

   ```bash
   keytool -genkey -v -keystore android/upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
   ```

2. Copier [`android/keystore.properties.example`](../android/keystore.properties.example) vers `android/keystore.properties` et renseigner mots de passe, alias et chemin du fichier (voir commentaires dans l’exemple).

3. Préparer le bundle web + natif :

   ```bash
   npm run mobile:prepare
   ```

4. Générer l’AAB (depuis la racine du dépôt, inclut `mobile:prepare`) :

   ```bash
   npm run android:bundle
   ```

   Équivalent manuel : `npm run mobile:prepare` puis `cd android` et `./gradlew bundleRelease` (Linux/macOS) ou `gradlew.bat bundleRelease` (Windows).

   Fichier attendu : `android/app/build/outputs/bundle/release/app-release.aab`.

5. Dans **Play Console** : créer une version de production ou test interne / fermé, importer l’AAB, compléter les fiches (données, confidentialité, cible API, etc.).

**Sans** `keystore.properties`, `bundleRelease` utilise la **signature debug** : utile pour vérifier la chaîne de build, **inacceptable** pour un déploiement Play public.

### Secrets GitHub — workflow `Release Android (AAB)`

Fichier : [`.github/workflows/release-android.yml`](../.github/workflows/release-android.yml).

#### Obligatoires (signature + bundle connecté à Supabase)

| Secret | Description |
|--------|-------------|
| `ANDROID_KEYSTORE_BASE64` | Contenu du fichier `.jks` encodé en base64 (une ligne). |
| `ANDROID_STORE_PASSWORD` | Mot de passe du keystore (`storePassword`). |
| `ANDROID_KEY_PASSWORD` | Mot de passe de la clé (`keyPassword`). |
| `ANDROID_KEY_ALIAS` | Alias de la clé (ex. `upload`). |
| `VITE_SUPABASE_URL` | URL du projet Supabase (même valeur qu’en prod dans `.env.local`). |
| `VITE_SUPABASE_ANON_KEY` | Clé anon Supabase (publique, embarquée dans l’app). |

Sans `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`, le workflow **échoue** : l’AAB doit refléter la prod, pas des placeholders de CI.

#### Optionnels (recommandés pour test interne / monitoring)

| Secret | Description |
|--------|-------------|
| `VITE_SENTRY_DSN` | DSN Sentry — erreurs JS dans le WebView ([`src/instrument.ts`](../src/instrument.ts)). |
| `VITE_APP_URL` | URL publique du site (canonical, og:url). |
| `VITE_POSTHOG_KEY` / `VITE_POSTHOG_HOST` | Analytics produit (voir [`src/lib/analytics.ts`](../src/lib/analytics.ts)). |
| `VITE_FIREBASE_*` | Push Web / FCM côté client (voir [`.env.example`](../.env.example)). |

`VITE_APP_VERSION` est définie automatiquement dans le workflow à partir de `package.json` (pas besoin de secret).

**Build local (AAB sans GitHub)** : copier [`.env.example`](../.env.example) vers `.env.local`, renseigner au minimum `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` et idéalement `VITE_SENTRY_DSN`, puis `npm run mobile:prepare` et `bundleRelease` comme ci-dessus.

**Phases test interne / fermé, Sentry, P0** : voir [`docs/rollout-beta-stores.md`](rollout-beta-stores.md).

Encodage local du keystore (exemple) :

```bash
# Linux / macOS
base64 -w 0 android/upload-keystore.jks

# PowerShell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("android/upload-keystore.jks"))
```

Déclencheurs : **workflow manuel** (`workflow_dispatch`) ou **tag** `v*` (ex. `v0.2.0`). L’artefact `app-release-aab` est disponible dans l’onglet Actions.

Pour définir les secrets `VITE_*` sans passer par l’interface web : `gh secret set VITE_SUPABASE_URL --body "https://…"` (idem pour `VITE_SUPABASE_ANON_KEY`, `VITE_SENTRY_DSN`, etc.), en reprenant les valeurs de votre `.env.local` de production.

## App Store Connect — build local

1. `npm run mobile:prepare`
2. Ouvrir le projet : `npm run cap:open:ios`
3. Dans Xcode : **Signing & Capabilities** — équipe, bundle `com.esamba.flotte`, **Push Notifications** si utilisé.
4. **Product → Archive**, puis **Distribute App** → App Store Connect.

Fichier d’export optionnel pour `xcodebuild -exportArchive` : [`ios/App/ExportOptions-appstore.plist`](../ios/App/ExportOptions-appstore.plist) (`method` = `app-store`). L’équipe et les profils sont en pratique gérés par Xcode (signature automatique) ou par vos profils en CI.

### Workflow GitHub — `Release iOS (build simulateur)`

[`.github/workflows/release-ios.yml`](../.github/workflows/release-ios.yml) compile le schéma **App** pour le **simulateur** afin de détecter les régressions sans certificats de distribution. Il **ne** produit **pas** d’IPA ni d’upload vers App Store Connect.

Pour automatiser archive + upload, il faudra des certificats, profils et souvent une clé API App Store Connect (ex. **Fastlane** `match` + `deliver` / `pilot`) — hors périmètre du dépôt actuel.

## Fichiers sensibles (ne pas commiter)

### Android — keystore de signature Play

- **Ne jamais committer** `android/upload-keystore.jks` ni `android/keystore.properties`. Ils contiennent l’identité de signature de l’app sur Google Play ; les exposer dans Git reviendrait à compromettre cette identité.
- **Sauvegarde obligatoire** : conserver une **copie du fichier `.jks`** et les **mots de passe** (keystore + clé) dans un **coffre-fort d’équipe** (gestionnaire de secrets, coffre chiffré, procédure interne). Sans cette sauvegarde, en cas de perte du poste ou du dépôt local, **vous ne pourrez plus signer les mises à jour** avec le même certificat : Google Play exige la **même clé** pour toutes les versions d’une même application (sauf migration planifiée avec Play App Signing et procédure dédiée).
- Les motifs d’exclusion Git sont dans [`.gitignore`](../.gitignore) (`android/keystore.properties`, `android/*.jks`, etc.).

### Autres secrets

- Certificats Apple, profils `.mobileprovision`, mots de passe hors dépôt.

## Références internes

- Build web Capacitor en CI : [`.github/workflows/build-capacitor.yml`](../.github/workflows/build-capacitor.yml)
- Rollout test interne / fermé, Sentry, P0 : [`docs/rollout-beta-stores.md`](rollout-beta-stores.md)
- Rollout production combiné (web Vercel + stores, surveillance, paliers) : [`rollout-production-web-mobile.md`](rollout-production-web-mobile.md)
- Liens profonds : [`docs/deep-links-esamba.md`](deep-links-esamba.md)
