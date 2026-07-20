# E-Samba — esamba-app

Projet Vite + React + Capacitor (`com.esamba.app`).

## Web (dev)

```bash
npm run dev    # http://localhost:3000
```

Renseigner `.env` : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

## Mobile (Android / iOS)

```bash
# Dans esamba-app/

# 1. Build web
npm run build        # → dist/

# 2. Sync le dist vers Android/iOS
npx cap sync         # copie dist/ + met à jour les plugins natifs

# 3. Ouvrir dans Android Studio
npx cap open android

# 4. (optionnel) iOS
npx cap open ios     # nécessite macOS + Xcode
```

### Raccourcis npm

```bash
npm run mobile:prepare   # build + cap sync
npm run android          # prepare + Android Studio
npm run ios              # prepare + Xcode (macOS)
```

## Firebase Android (push)

1. [console.firebase.google.com](https://console.firebase.google.com)
2. Créer projet **E-Samba-Prod**
3. Ajouter app Android → `com.esamba.app`
4. Télécharger `google-services.json`
5. Copier dans : `android/app/google-services.json`

Puis `npm run mobile:prepare`.

Détail : dépôt parent `docs/bootstrap/firebase-android-setup.md`.
