# Firebase Android — esamba-app (greenfield)

Configuration FCM pour le projet greenfield **`com.esamba.app`**.

## Checklist Console Firebase

1. Ouvrir [console.firebase.google.com](https://console.firebase.google.com)
2. Créer le projet **`E-Samba-Prod`**
3. **Ajouter une application Android** → package : `com.esamba.app`
4. Télécharger **`google-services.json`**
5. Copier dans :

   ```
   esamba-app/android/app/google-services.json
   ```

Puis resynchroniser Capacitor :

```bash
cd esamba-app
npm run mobile:prepare
# ou : npm run build && npx cap sync
```

## Variables `.env` (côté web / plugin Firebase)

Renseigner dans `esamba-app/.env` (voir template greenfield) :

```env
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=e-samba-prod.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=e-samba-prod
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:android:...
```

Les valeurs se trouvent dans Firebase Console → Paramètres du projet → Vos applications.

## Vérifications

| Contrôle | Attendu |
|----------|---------|
| `package_name` dans `google-services.json` | `com.esamba.app` |
| `capacitor.config.ts` → `appId` | `com.esamba.app` |
| Plugin installé | `@capacitor-firebase/messaging` |
| Fichier présent après sync | `android/app/google-services.json` |

## Sécurité

- Ne pas committer `google-services.json` si le dépôt est public (ajouter à `.gitignore`).
- La **clé serveur FCM** (`AAAA…`) reste côté backend / Edge Functions — jamais en `VITE_*`.

## Dépôt production (smart-fleet-africa)

| Greenfield | Production Flotte |
|------------|-------------------|
| `com.esamba.app` | `com.esamba.flotte` |
| Projet `E-Samba-Prod` | Projet Firebase `taxis-flotte` |
| Copie manuelle du JSON | `npm run install:google-services` (`.env.local`) |

Voir [push-notifications-capacitor.md](../push-notifications-capacitor.md).
