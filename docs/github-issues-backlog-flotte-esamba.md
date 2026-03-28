# Backlog GitHub — Flotte E-Samba (Smart Fleet Africa)

Ce document décline la TODO technique en **issues numérotées** (une ligne = une issue).  
**Usage** : copier chaque bloc « Corps suggéré » dans une nouvelle issue GitHub, ou utiliser la CLI `gh` (voir fin de fichier).

**Labels suggérés** : `priorité:P0` | `priorité:P1` | `priorité:P2` | `priorité:P3` · `zone:web` | `zone:mobile` | `zone:supabase` · `état:livré` | `état:bug` | `état:feature` · `complexité:faible` | `complexité:moyenne` | `complexité:forte`

---

## Fait (référence — peut être fermé tout de suite ou ignoré comme backlog ouvert)

### #001 — Architecture Repository / Service / hooks

- **Priorité** : P3  
- **Complexité** : —  
- **Fichiers** : `src/repositories/*`, `src/services/*`, `src/hooks/*`  
- **Corps suggéré** :
  - Architecture en couches Repository → Service → hooks React Query en place. Issue de référence ; rien à implémenter.

---

### #002 — Projet Capacitor (config native)

- **Priorité** : P3  
- **Complexité** : —  
- **Fichiers** : `capacitor.config.ts`, `android/`, `ios/`  
- **Corps suggéré** :
  - Projet Capacitor configuré (`webDir`, `appId`, plugins). Sync documenté (`mobile:prepare`).

---

### #003 — Deep links esamba://

- **Priorité** : P3  
- **Complexité** : —  
- **Fichiers** : `src/lib/deepLinks/*`, `src/services/deep-link.service.ts`, `src/components/navigation/DeepLinkListener.tsx`  
- **Corps suggéré** :
  - Schéma `esamba://`, parsing, navigation via événements window + Capacitor `appUrlOpen`.

---

### #004 — Notifications push (plugin + service)

- **Priorité** : P3  
- **Complexité** : —  
- **Fichiers** : `src/services/push-notification.service.ts`, `src/components/mobile/PushNotificationBridge.tsx`, `src/App.tsx`  
- **Corps suggéré** :
  - Plugin `@capacitor/push-notifications`, permission, token, tap → `deepLinkService.dispatchFromPushPayload`.

---

### #005 — Sync incidents hors ligne

- **Priorité** : P3  
- **Complexité** : —  
- **Fichiers** : `src/services/offlineIncidentSync.service.ts`, `src/components/OfflinePendingSyncBridge.tsx`  
- **Corps suggéré** :
  - File d’attente brouillons incidents + sync au retour réseau.

---

### #006 — Permissions Android manifest

- **Priorité** : P3  
- **Complexité** : —  
- **Fichiers** : `android/app/src/main/AndroidManifest.xml`  
- **Corps suggéré** :
  - Caméra, géoloc, médias, notifications (`POST_NOTIFICATIONS`, etc.) déclarées.

---

### #007 — Migrations Supabase / baseline

- **Priorité** : P3  
- **Complexité** : —  
- **Fichiers** : `supabase/migrations/*`, `supabase/baseline/*`  
- **Corps suggéré** :
  - Chaîne migrations + doc README onboarding BDD.

---

### #008 — Sentry ErrorBoundary global

- **Priorité** : P3  
- **Complexité** : —  
- **Fichiers** : `src/App.tsx`  
- **Corps suggéré** :
  - `@sentry/react` ErrorBoundary sur l’app.

---

## À corriger

### #009 — ESLint exhaustive-deps sur OfflinePendingSyncBridge

- **Priorité** : P1  
- **Complexité** : faible  
- **Fichiers** : `src/components/OfflinePendingSyncBridge.tsx`  
- **Corps suggéré** :
  - Corriger l’avertissement `react-hooks/exhaustive-deps` (dépendances `user` vs `user?.id`) pour fiabiliser les re-sync.

---

### #010 — Aligner Settings avec useEsambaDataVerification

- **Priorité** : P2  
- **Complexité** : faible  
- **Fichiers** : `src/pages/Settings.tsx`, hooks de vérification E-Samba associés  
- **Corps suggéré** :
  - Vérifier cohérence des clés (`membership_organizer`, `vehicule_esamba_001`, etc.) avec le hook. Réf. `CORRECTION-PAGE-SETTINGS.md`.

---

### #011 — RLS / RPC véhicules et invitations

- **Priorité** : P2  
- **Complexité** : moyenne  
- **Fichiers** : migrations Supabase, `src/repositories/*` (véhicules, invitations)  
- **Corps suggéré** :
  - Si erreurs RLS persistent en prod : s’appuyer sur RPC `SECURITY DEFINER` (modèle documenté pour véhicules / invitations).

---

### #012 — Clarifier liste flotte mock vs données réelles

- **Priorité** : P2  
- **Complexité** : moyenne  
- **Fichiers** : `src/features/fleet/screens/FleetVehiclesListPage.tsx`, `src/features/fleet/data/mockFleetVehicles.ts`  
- **Corps suggéré** :
  - Liste encore en mock (`MOCK_FLEET_USE_DEMO_DATA`) : brancher `useVehicles` ou afficher explicitement le mode démo.

---

### #013 — Clarifier alertes mock vs données réelles

- **Priorité** : P2  
- **Complexité** : moyenne  
- **Fichiers** : `src/features/alerts/screens/IncidentAlertsListPage.tsx`, hooks / mocks alertes  
- **Corps suggéré** :
  - Données mock : bascule API réelle ou libellé « démo » en UI.

---

## À implémenter avant V1

### #014 — Désactiver mock auth en production

- **Priorité** : P0  
- **Complexité** : forte  
- **Fichiers** : `src/lib/authMode.ts`, `src/hooks/useAuth.ts`, `src/pages/LoginPage.tsx`, `.env.example`  
- **Corps suggéré** :
  - `VITE_USE_MOCK_AUTH` réservé au dev/test ; flux login réel Supabase (+ OTP si prévu).

---

### #015 — Ajouter google-services.json et valider FCM Android

- **Priorité** : P0  
- **Complexité** : moyenne  
- **Fichiers** : `android/app/google-services.json`, `android/app/build.gradle`  
- **Corps suggéré** :
  - Placer le fichier Firebase pour le package `com.esamba.flotte` ; vérifier build + réception push sur device.

---

### #016 — Backend : stocker tokens push et envoyer les notifications

- **Priorité** : P0  
- **Complexité** : forte  
- **Fichiers** : `src/services/push-notification.service.ts` + nouveau backend (Edge Functions / API)  
- **Corps suggéré** :
  - Persister le token device par utilisateur ; envoyer FCM selon règles métier (alertes, entretien, etc.).

---

### #017 — Remplacer mocks par données Supabase (fleet / alerts / ops)

- **Priorité** : P1  
- **Complexité** : forte  
- **Fichiers** : `src/features/fleet/*`, `src/features/alerts/*`, `src/features/operations/*`  
- **Corps suggéré** :
  - Écrans exposés aux utilisateurs : données réelles via services existants.

---

### #018 — Hub opérations : sortir du mock

- **Priorité** : P1  
- **Complexité** : forte  
- **Fichiers** : `src/features/operations/*`, `src/lib/operationsMock.ts`  
- **Corps suggéré** :
  - Missions / interventions : données API ou scénario démo explicitement fermé.

---

### #019 — Brancher liste véhicules sur useVehicles

- **Priorité** : P1  
- **Complexité** : moyenne  
- **Fichiers** : `src/features/fleet/screens/FleetVehiclesListPage.tsx`, `src/hooks/useVehicles.ts`  
- **Corps suggéré** :
  - Raccorder la liste mobile/web à `VehicleService` / `useVehicles` comme le reste du dashboard.

---

### #020 — Tests + CI sans warning lint bloquant

- **Priorité** : P2  
- **Complexité** : moyenne  
- **Fichiers** : `src/test/*`, workflow CI, `package.json`  
- **Corps suggéré** :
  - Couvrir chemins critiques (auth, incidents, push → deep link) ; `npm run lint` vert en CI.

---

### #021 — Tests intégration sync offline incidents

- **Priorité** : P2  
- **Complexité** : moyenne  
- **Fichiers** : `src/components/OfflinePendingSyncBridge.tsx`, `src/services/offlineIncidentSync.service.ts`  
- **Corps suggéré** :
  - Tests manuels documentés + tests auto possibles sur sync après reconnexion.

---

### #022 — QA E2E parcours Paramètres

- **Priorité** : P2  
- **Complexité** : moyenne  
- **Fichiers** : `src/pages/Settings.tsx`  
- **Corps suggéré** :
  - Parcours complet vérification E-Samba, véhicule, invitations sur compte réel.

---

### #023 — Doc README commandes mobile

- **Priorité** : P3  
- **Complexité** : faible  
- **Fichiers** : `README.md`, `package.json`  
- **Corps suggéré** :
  - Vérifier que `mobile:prepare`, `cap:open:android` / iOS sont à jour pour l’onboarding.

---

## À implémenter après V1

### #024 — iOS production : signing, APNs, Firebase

- **Priorité** : P0  
- **Complexité** : forte  
- **Fichiers** : `ios/`, certificats Apple, `GoogleService-Info.plist` si FCM  
- **Corps suggéré** :
  - Release App Store : capabilities Push, clés APNs, plist Firebase.

---

### #025 — File d’attente offline multi-entités

- **Priorité** : P1  
- **Complexité** : forte  
- **Fichiers** : `src/services/*`, stockage local  
- **Corps suggéré** :
  - Étendre le mode hors ligne au-delà des incidents si besoin terrain.

---

### #026 — Géolocalisation arrière-plan

- **Priorité** : P1  
- **Complexité** : forte  
- **Fichiers** : `android/app/src/main/AndroidManifest.xml`, `Info.plist`, hooks géoloc  
- **Corps suggéré** :
  - `ACCESS_BACKGROUND_LOCATION` + conformité Play Store / Apple si suivi continu.

---

### #027 — Internationalisation (i18n)

- **Priorité** : P2  
- **Complexité** : moyenne  
- **Fichiers** : `src/`, `index.html`  
- **Corps suggéré** :
  - FR/EN ou locales régionales selon cible commerciale.

---

### #028 — Affinage rôles et RLS Supabase

- **Priorité** : P2  
- **Complexité** : moyenne  
- **Fichiers** : `src/features/roles/*`, politiques SQL  
- **Corps suggéré** :
  - Mécanicien, organisateur : règles fines côté RLS et UI.

---

### #029 — Monitoring Sentry / métriques

- **Priorité** : P3  
- **Complexité** : faible  
- **Fichiers** : config Sentry, éventuellement Web Vitals  
- **Corps suggéré** :
  - Tableaux de bord par release, alertes erreurs.

---

### #030 — Rapports et exports avancés

- **Priorité** : P3  
- **Complexité** : moyenne  
- **Fichiers** : `src/pages/Reports.tsx`, services export  
- **Corps suggéré** :
  - PDF/Excel avancés, planification d’exports.

---

## Annexe — Exemples GitHub CLI (`gh`)

Depuis la racine du dépôt (après `gh auth login`), créer une issue :

```bash
gh issue create --title "[P1] ESLint exhaustive-deps sur OfflinePendingSyncBridge" --body-file - <<'EOF'
Priorité : P1 · Complexité : faible
Fichiers : src/components/OfflinePendingSyncBridge.tsx
Corriger l'avertissement react-hooks/exhaustive-deps pour fiabiliser les re-sync.
EOF
```

Pour importer en masse, répéter avec les titres `#009` à `#030` ou utiliser un script qui lit ce fichier.

---

*Généré pour le dépôt Flotte E-Samba — numérotation #001–#030.*
