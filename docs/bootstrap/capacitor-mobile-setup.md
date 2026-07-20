# Capacitor — Android, Push, Deep Links, APK release

Guide opérationnel pour **Flotte E-Samba** (`com.esamba.flotte`).

**Checklist Android Studio complète** : [android-studio-capacitor-checklist.md](./android-studio-capacitor-checklist.md)

## Prérequis

- Node.js **22+**
- Android Studio + SDK (API 34+ recommandé)
- `android/local.properties` avec `sdk.dir` (voir `android/local.properties.example`)
- `.env.local` avec `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`

Deux scripts selon le contexte :

| Contexte | Commande |
|----------|----------|
| **Ce dépôt** (déjà cloné) | `npm run setup:vite` ou `bash scripts/vite-setup.sh` |
| **Nouveau projet** (dossier vide) | `bash scripts/vite-greenfield-setup.sh` → crée `esamba-app/` |

Le greenfield utilise `com.esamba.app` et `@capacitor-firebase/messaging`.  
La production **Flotte E-Samba** utilise `com.esamba.flotte` et `@capacitor/push-notifications`.

## Dans `esamba-app/` (greenfield)

Après `bash scripts/vite-greenfield-setup.sh` et édition du `.env` :

```bash
cd esamba-app

# 1. Build web
npm run build        # → dist/  (vite.config : base './' pour Capacitor)

# 2. Sync dist vers Android/iOS
npx cap sync         # copie dist/ + met à jour les plugins natifs

# 3. Ouvrir Android Studio
npx cap open android

# 4. (optionnel) iOS — macOS + Xcode requis
npx cap open ios
```

Raccourcis ajoutés au `package.json` greenfield par `npm run greenfield:write-configs` :

| Script | Équivalent |
|--------|------------|
| `npm run mobile:prepare` | `npm run build && npx cap sync` |
| `npm run cap:sync` | `npx cap sync` |
| `npm run android` | `mobile:prepare` + `cap open android` |
| `npm run ios` | `mobile:prepare` + `cap open ios` |

Live reload (dev) : `npm run dev` puis, dans `capacitor.config.ts`, décommenter `server.url` avec l’IP LAN (`http://192.168.x.x:3000`).

## Workflow build + sync (dépôt production)

```powershell
# Toujours builder en mode capacitor (base relative './')
npm run mobile:prepare
# = npm run build:capacitor && npm run cap:sync
```

| Commande | Effet |
|----------|-------|
| `npm run build:capacitor` | Vite `base: './'` → dossier `dist/` |
| `npm run cap:sync` | Copie vers `android/` et `ios/`, met à jour les plugins |
| `npm run cap:doctor` | Vérifie Node 22 avant sync |
| `npm run cap:open:android` | Ouvre Android Studio |

## Développement web + live reload Android

```powershell
# Terminal 1 — serveur Vite (LAN)
npm run dev
# → http://localhost:8080 (ou IP locale pour l'émulateur)

# Terminal 2 — émulateur démarré dans Android Studio, puis :
npm run cap:cli -- run android --livereload --external
```

Sans émulateur : `adb devices` doit lister un appareil.

## Configuration Capacitor

Fichier : `capacitor.config.ts`

| Paramètre | Valeur |
|-----------|--------|
| `appId` | `com.esamba.flotte` |
| `webDir` | `dist` |
| `backgroundColor` | `#00C853` (marque) |
| `server.androidScheme` | `https` |

## Push notifications (FCM)

### Fichiers clés

| Fichier | Rôle |
|---------|------|
| `android/app/google-services.json` | Config Firebase (non versionné si sensible) |
| `src/components/mobile/PushNotificationBridge.tsx` | Enregistrement token FCM |
| `src/services/push-notification.service.ts` | Logique métier push |
| `docs/push-notifications-capacitor.md` | Détail complet |

### Firebase + google-services.json

**Greenfield (`esamba-app/`, `com.esamba.app`)** — procédure complète : [firebase-android-setup.md](./firebase-android-setup.md)

1. [console.firebase.google.com](https://console.firebase.google.com)
2. Créer projet **`E-Samba-Prod`**
3. Ajouter app Android → **`com.esamba.app`**
4. Télécharger `google-services.json`
5. Copier dans **`esamba-app/android/app/google-services.json`**

**Production (`smart-fleet-africa`, `com.esamba.flotte`)** :

```powershell
# .env.local : GOOGLE_SERVICES_JSON_PATH=C:\chemin\google-services.json
npm run install:google-services
```

Projet Firebase cible : **`taxis-flotte`**.

Secret serveur (Edge Functions, **pas** `VITE_*`) : `FCM_SERVER_KEY`.

Permission manifest : `POST_NOTIFICATIONS` (Android 13+).

## Deep Links

Schéma custom : `esamba://`

| Lien | Route SPA |
|------|-----------|
| `esamba://fleet` | `/dashboard/vehicles` |
| `esamba://fleet/:id` | `/dashboard/vehicles/:id` |
| `esamba://alerts` | `/dashboard/alerts` |
| `esamba://auth/callback?code=…` | PKCE Supabase |
| `https://www.e-samba.com/dashboard/...` | App Links HTTPS |

Fichiers :

- `src/components/navigation/DeepLinkListener.tsx`
- `src/services/deep-link.service.ts`
- `android/app/src/main/AndroidManifest.xml` (intent-filters)
- `docs/deep-links-esamba.md`

Debug console : `window.__ESAMBA_DEBUG_DEEPLINK__ = true`

## APK release (debug / release)

### Debug rapide (QA)

```powershell
rebuild-and-install.bat --qa
# ou : npm run mobile:prepare puis Gradle assembleDebug
```

### APK release signé

```powershell
# 1. Keystore (une fois)
npm run setup:android-keystore

# 2. Build release
npm run android:assemble-release
# Sortie : android/app/build/outputs/apk/release/app-release.apk
```

### AAB Google Play

```powershell
npm run mobile:sync-version   # incrémente versionCode
npm run android:bundle
# Sortie : android/app/build/outputs/bundle/release/app-release.aab
```

Voir `docs/publication-stores.md` pour la checklist Play Console.

## Dépannage

| Problème | Solution |
|----------|----------|
| `Capacitor CLI requires NodeJS >=22` | `npm run cap:sync` (wrapper Node 22) |
| Écran blanc WebView | Vérifier `build:capacitor` (pas `build` seul) |
| `adb devices` vide | Démarrer émulateur ou activer débogage USB |
| Auth mobile | Deep link `esamba://auth/callback` + redirect Supabase |
| Push sans token | `google-services.json` + permission notifications |

## Références

- [AUDIT-ESAMBA-12juin2026.md](../audit/AUDIT-ESAMBA-12juin2026.md)
- [vite-config-files.ts](./vite-config-files.ts)
- [README.md](../../README.md) — section mobile
