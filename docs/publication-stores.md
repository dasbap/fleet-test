# Publication Google Play et App Store Connect — Flotte E-Samba

Ce document décrit la configuration du dépôt pour produire des livrables store, les secrets GitHub Actions et les étapes manuelles côté consoles.

**Identifiant d’application** : `com.esamba.flotte` (voir [`capacitor.config.ts`](../capacitor.config.ts)).

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

4. Générer l’AAB :

   ```bash
   cd android && ./gradlew bundleRelease
   ```

   Fichier attendu : `android/app/build/outputs/bundle/release/app-release.aab`.

5. Dans **Play Console** : créer une version de production ou test interne / fermé, importer l’AAB, compléter les fiches (données, confidentialité, cible API, etc.).

**Sans** `keystore.properties`, `bundleRelease` utilise la **signature debug** : utile pour vérifier la chaîne de build, **inacceptable** pour un déploiement Play public.

### Secrets GitHub — workflow `Release Android (AAB)`

Fichier : [`.github/workflows/release-android.yml`](../.github/workflows/release-android.yml).

| Secret | Description |
|--------|-------------|
| `ANDROID_KEYSTORE_BASE64` | Contenu du fichier `.jks` encodé en base64 (une ligne). |
| `ANDROID_STORE_PASSWORD` | Mot de passe du keystore (`storePassword`). |
| `ANDROID_KEY_PASSWORD` | Mot de passe de la clé (`keyPassword`). |
| `ANDROID_KEY_ALIAS` | Alias de la clé (ex. `upload`). |

Encodage local du keystore (exemple) :

```bash
# Linux / macOS
base64 -w 0 android/upload-keystore.jks

# PowerShell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("android/upload-keystore.jks"))
```

Déclencheurs : **workflow manuel** (`workflow_dispatch`) ou **tag** `v*` (ex. `v0.2.0`). L’artefact `app-release-aab` est disponible dans l’onglet Actions.

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
- Liens profonds : [`docs/deep-links-esamba.md`](deep-links-esamba.md)
