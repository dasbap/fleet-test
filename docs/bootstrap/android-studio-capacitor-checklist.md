# Android Studio + Capacitor — Checklist Flotte E-Samba

Guide opérationnel pour **`com.esamba.flotte`** (WebView Capacitor + Supabase Auth).

## Commandes exactes (premier démarrage)

```powershell
# 1. Dépendances
npm install

# 2. Variables d'environnement (racine du dépôt)
# .env.local : VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY

# 3. Build web mode Capacitor (base relative ./)
npm run build:capacitor

# 4. Sync plugins natifs → dossier android/
npm run cap:sync:android
# ou : npx cap sync android

# 5. Ouvrir Android Studio
npm run cap:open:android
# ou raccourci : npm run android
```

### Rebuild complet (après changement plugins / config)

```powershell
npm run mobile:rebuild
npm run cap:open:android
```

### Lancer sur émulateur / appareil (CLI)

```powershell
npm run android:run
# Prérequis : adb devices liste un appareil
```

### Live reload (dev)

```powershell
# Terminal 1
npm run dev

# Terminal 2 — émulateur démarré
npm run cap:cli -- run android --livereload --external
```

## Checklist Android Studio

| Étape | Vérification |
|-------|----------------|
| SDK Platform | API **34+** (projet : compileSdk **36**) |
| Build Tools | Installés via SDK Manager |
| Command-line Tools | Installés |
| `local.properties` | `sdk.dir=...` (voir `android/local.properties.example`) |
| Gradle sync | Sans erreur après `cap sync` |
| `applicationId` | `com.esamba.flotte` (`android/app/build.gradle`) |
| Run configuration | Module `app`, variante `debug` |
| Émulateur | API 34+, Google Play si push FCM |

Script aide SDK : `npm run setup:capacitor-android-studio`

## Configuration projet (référence)

| Fichier | Rôle |
|---------|------|
| `capacitor.config.ts` | appId, webDir `dist`, androidScheme `https`, splash, push |
| `vite.config.ts` | `base: "./"` (mode capacitor), `outDir: "dist"` |
| `src/mobile/deepLinks.ts` | Routes auth / onboarding / dashboard / create-fleet |
| `src/integrations/supabase/client.ts` | PKCE, Preferences natif, `detectSessionInUrl: false` en natif |
| `AndroidManifest.xml` | Permissions, `singleTask`, `esamba://`, `com.esamba.flotte://`, App Links |
| `MainActivity.java` | `extends BridgeActivity` |

## Supabase Dashboard — Authentication → URL Configuration

| Paramètre | Valeur |
|-----------|--------|
| Site URL | `https://www.e-samba.com` |
| Redirect URLs | `https://www.e-samba.com/**` |
| | `https://www.e-samba.com/auth/callback` |
| | `https://www.e-samba.com/auth/update-password` |
| | `esamba://**` |
| | `com.esamba.flotte://**` |

Push config locale : `npm run supabase:push-auth-config`

### Email Reset Password (template Supabase)

```
{{ .SiteURL }}/auth/update-password?token_hash={{ .TokenHash }}&type=recovery
```

Page SPA : `src/features/auth/screens/UpdatePasswordPage.tsx` (`verifyOtp` + `updateUser`).

## Checklist tests manuels Android

- [ ] Lancement app (splash → dashboard ou login)
- [ ] Login email/mot de passe
- [ ] Signup + confirmation email
- [ ] Magic link → `esamba://auth/callback` ou App Link HTTPS
- [ ] Reset password → `/auth/update-password?token_hash=…&type=recovery`
- [ ] Onboarding wizard
- [ ] Création flotte (`/dashboard/create-fleet`)
- [ ] Dashboard chargé (pas d'écran blanc prolongé)
- [ ] Session persistante après fermeture app
- [ ] Bouton retour Android (ne quitte pas brutalement)
- [ ] Deep link `esamba://dashboard` / notification push
- [ ] Mode réseau faible (login + file offline)
- [ ] Logout → retour login, token effacé

Tests unitaires deep links : `npm test -- src/test/mobile.deepLinks.test.ts`

Tests instrumentés (appareil/émulateur) :

```powershell
cd android
.\gradlew.bat connectedDebugAndroidTest
```

## Build release

| Artefact | Commande | Sortie |
|----------|----------|--------|
| APK debug | `npm run mobile:prepare` puis Gradle `assembleDebug` | `android/app/build/outputs/apk/debug/` |
| APK release | `npm run android:assemble-release` | `.../apk/release/app-release.apk` |
| AAB Play Store | `npm run android:bundle` | `.../bundle/release/app-release.aab` |

Keystore (une fois) : `npm run setup:android-keystore`  
Version : `npm run mobile:sync-version`

## Erreurs fréquentes et solutions

| Problème | Cause probable | Solution |
|----------|----------------|----------|
| Écran blanc WebView | Build Vercel (`base: /`) au lieu de Capacitor | `npm run build:capacitor` puis `cap sync` |
| Assets 404 (`file:///android_asset/...`) | Chemins absolus `/assets` | Vérifier `base: "./"` en mode capacitor |
| Auth boucle login | Redirect URL manquante Supabase | Ajouter `esamba://**` et `com.esamba.flotte://**` |
| Reset password « lien invalide » | Token expiré ou mauvais template email | Template avec `token_hash` + `type=recovery` |
| `Capacitor CLI requires Node >=22` | Node 20 | `npm run cap:sync` (wrapper Node 22) |
| Gradle sync failed | SDK manquant | SDK Manager API 34+, `local.properties` |
| `adb devices` vide | USB debug off / émulateur arrêté | Activer débogage USB ou lancer AVD |
| App Links non vérifiés | `assetlinks.json` / empreinte debug | `npm run supabase:push-auth-config` |
| Mixed content bloqué | HTTP en prod | `allowMixedContent: false` (ne pas activer) |
| Session perdue | Cache WebView vidé | Preferences auth (`supabaseAuthStorage.ts`) |

## Scripts npm mobile

| Script | Effet |
|--------|-------|
| `build:capacitor` | Vite build mode capacitor → `dist/` |
| `cap:sync` | Sync Android + iOS |
| `cap:sync:android` | Sync Android uniquement |
| `cap:open:android` | Ouvre Android Studio |
| `android` | prepare + open Android Studio |
| `android:run` | prepare + `cap run android` |
| `android:clean` | `gradlew clean` |
| `mobile:rebuild` | clean + prepare |
| `mobile:prepare` | `build:capacitor` + `cap:sync` |

## Références

- [capacitor-mobile-setup.md](./capacitor-mobile-setup.md)
- [deep-links-esamba.md](../deep-links-esamba.md)
- [publication-stores.md](../publication-stores.md)
