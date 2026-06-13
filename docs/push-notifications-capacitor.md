# Push notifications — Capacitor + FCM (E-Samba)

> **Stack officielle** : Capacitor (`@capacitor/push-notifications`), **pas** React Native Firebase ni Notifee.

## Flux

```
App Capacitor → token FCM/APNs → notification_tokens (Supabase)
Edge Function (send-notification, …) → FCM legacy API → device
Tap notification → mapPushDataToDeepLinkPayload → deep-link.service
```

Vérification automatisée : `npm run verify:fcm`

---

## Ne pas utiliser (hook RN externe)

Un hook type `@react-native-firebase/messaging` + Notifee + `profiles.fcm_token` **n’est pas compatible** avec ce dépôt :

| Sujet | Hook RN typique | E-Samba |
|--------|-----------------|---------|
| Persistance token | `profiles.fcm_token`, `drivers.fcm_token` | Table **`notification_tokens`** uniquement |
| Enregistrement | Supabase direct dans le hook | `useRegisterNotificationToken` → `NotificationService` → `NotificationRepository` |
| Payload FCM `data` | `notification_type` | **`category`** (alias `type`, `esamba_category`) |
| Navigation | Écrans RN (`DocumentsStack`, …) | Deep links SPA (`esambaUrl`, `internalPath`, `deepLinkTarget`) |
| Android channels | `esamba_alerts`, `esamba_info`, … | Canal `esamba_default` |

Les colonnes `fcm_token` sur `profiles` / `drivers` **n’existent pas** dans les migrations Supabase.

**Ne pas ajouter** `src/services/NotificationService.background.ts` (handler RN `setBackgroundMessageHandler` + Notifee) ni l’enregistrer dans un `index.js` racine React Native.

---

## Background / foreground (Capacitor vs RN proposé)

| Comportement RN (`NotificationService.background.ts`) | Équivalent E-Samba |
|-----------------------------------------------------|-------------------|
| `messaging().setBackgroundMessageHandler` (data-only → Notifee) | L’OS affiche le bloc FCM `notification` envoyé par les Edge Functions ; pas de handler JS en arrière-plan |
| `notifee.onBackgroundEvent` | [`pushNotificationActionPerformed`](src/services/push-notification.service.ts) → `deepLinkService` |
| `createNotificationChannels` (`esamba_alerts`, …) | [`ensureDefaultAndroidChannel()`](src/services/push-notification.service.ts) — canal `esamba_default` |
| `displayLocalNotification` (foreground) | [`NotificationsPermissionGate`](src/components/notifications/NotificationsPermissionGate.tsx) (toast) |
| Enregistrement racine `index.js` | [`PushNotificationBridge`](src/components/mobile/PushNotificationBridge.tsx) sous `AuthProviderLayout` |

### Règles payload serveur (FCM legacy)

Les Edge Functions envoient **toujours** `notification: { title, body }` **et** `data` (chaînes). Ne pas passer en **data-only** (sans bloc `notification`) : Capacitor ne réplique pas l’affichage manuel Notifee.

Clés `data` côté client : `category`, `path`, `url` / `esambaUrl`, `alert_id`, etc. — pas `notification_type` ni `title`/`body` uniquement dans `data`.

---

## Fichiers clés

| Couche | Fichier |
|--------|---------|
| Hook | [`src/hooks/usePushNotifications.ts`](../src/hooks/usePushNotifications.ts) |
| Service Capacitor | [`src/services/push-notification.service.ts`](../src/services/push-notification.service.ts) |
| Enregistrement BDD | [`src/hooks/useNotifications.ts`](../src/hooks/useNotifications.ts), [`src/repositories/notification.repository.ts`](../src/repositories/notification.repository.ts) |
| Bridge (montage) | [`PushNotificationBridge`](../src/components/mobile/PushNotificationBridge.tsx) dans `AuthProviderLayout` — **pas** `App.tsx` (React Router, pas React Navigation) |
| UI permission | [`src/components/notifications/NotificationsPermissionGate.tsx`](../src/components/notifications/NotificationsPermissionGate.tsx) |
| Envoi serveur | [`supabase/functions/send-notification/`](../supabase/functions/send-notification/) |
| Secret | `FCM_SERVER_KEY` (API FCM **legacy**, format `AAAA…`) |

---

## Payload FCM `data` (côté serveur)

Toutes les valeurs sont des **chaînes**. Exemples de `category` :

| `category` | Navigation client |
|------------|-------------------|
| `critical_alert` | Alerte (`alert_id`) |
| `maintenance_due` | Véhicule ou liste entretien |
| `document_expiring` | Véhicule ou paramètres |
| `incident_reported` | Incidents |
| `intervention_assigned` | Intervention |

Priorité : `esambaUrl` ou `internalPath` si présents.

Tests : [`src/test/push-notification.service.test.ts`](../src/test/push-notification.service.test.ts)

---

## Firebase Android

- Fichier : [`android/app/google-services.json`](../android/app/google-services.json)
- Projet Firebase cible : **`taxis-flotte`**, package `com.esamba.flotte`
- Téléchargement : Firebase Console → Paramètres projet → Vos applications → Android → `google-services.json`

Installation depuis un fichier local :

```bash
# .env.local : GOOGLE_SERVICES_JSON_PATH=C:/chemin/google-services.json
npm run install:google-services
```

`verify:fcm` doit afficher OK sur `mobilesdk_app_id` (pas `REPLACE_FROM_FIREBASE_CONSOLE`).

---

## Dépannage FCM_SERVER_KEY

| Symptôme | Cause | Action |
|----------|-------|--------|
| Clé commence par `AIza` | apiKey Web, pas clé serveur | Firebase → Cloud Messaging → **Clé serveur** (`AAAA…`) |
| Clé ne commence pas par `AAAA` | Format invalide (ex. autre secret) | Remplacer dans `.env.local` puis `npm run secrets:supabase-edge` |
| Sonde Google HTTP 404 | API legacy désactivée ou mauvaise clé | Activer « Firebase Cloud Messaging » dans Google Cloud ; vérifier clé serveur |
| `notification_tokens` vide | Pas encore de device | Build Android + accepter notifications dans l’app |

---

## Table `notification_tokens`

Migration : [`20260331121000_notification_tokens.sql`](../supabase/migrations/20260331121000_notification_tokens.sql)  
Réparation prod (si table absente) : [`20260613120000_repair_notification_tokens_if_missing.sql`](../supabase/migrations/20260613120000_repair_notification_tokens_if_missing.sql)

SQL de contrôle : [`supabase/scripts/verify/verify-notification-tokens.sql`](../supabase/scripts/verify/verify-notification-tokens.sql)

---

## Enregistrement token (client)

- **Automatique** : [`PushNotificationBridge`](../src/components/mobile/PushNotificationBridge.tsx) upsert dans `notification_tokens` dès qu’un utilisateur connecté reçoit un token FCM (natif).
- **Manuel** : carte [`NotificationsPermissionGate`](../src/components/notifications/NotificationsPermissionGate.tsx) (bouton « Activer »).
- **Déconnexion** : `clearPushTokenOnLogout()` dans [`esamba-auth.ts`](../src/lib/auth/esamba-auth.ts) désactive le token en base.

---

## Checklist avant `FCM_SERVER_KEY`

1. `google-services.json` réel (`project_id` = `taxis-flotte`, `GOOGLE_SERVICES_JSON_PATH` dans `.env.local`)
2. `npm run verify:fcm` (secrets, sonde EF, tests unitaires)
3. Device : build Android + connexion + permission notifications → ligne dans `notification_tokens` (SQL : [`supabase/scripts/verify/verify-notification-tokens.sql`](../supabase/scripts/verify/verify-notification-tokens.sql))
4. Sonde `send-notification` : **500** « Clé serveur FCM non configurée » (chaîne OK jusqu’à FCM)
5. Ajouter `FCM_SERVER_KEY` dans `.env.local` → `npm run secrets:supabase-edge`
6. `npm run verify:fcm -- --probe-send` → **200** + push reçu sur device

---

## Commandes

```bash
npm test -- src/test/push-notification.service.test.ts src/services/notification.service.test.ts src/components/mobile/PushNotificationBridge.test.tsx src/test/clear-push-token-on-logout.test.ts
npm run install:google-services   # si GOOGLE_SERVICES_JSON_PATH défini
npm run verify:fcm -- --probe-key --expect-configured
npm run secrets:supabase-edge     # après FCM_SERVER_KEY AAAA… dans .env.local
npm run verify:fcm -- --probe-send
```
