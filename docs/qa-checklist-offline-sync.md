# Checklist QA — hors ligne, synchronisation, appareil, 3G

Procédure de validation pour **Flotte E-Samba** : file locale offline (incidents, créneaux, carburant), sync au retour réseau, APK Android, performance landing.

**Périmètre hors ligne (code)** : la mise en file **immédiate** lorsque `navigator.onLine === false` couvre:
- incidents (`useDeclareIncident` / `useCreateIncident`) dans [`src/hooks/useIncidents.ts`](../src/hooks/useIncidents.ts)
- démarrage/clôture de créneau (`useStartShift` / `useCloseShift`) dans [`src/hooks/useDriverShifts.ts`](../src/hooks/useDriverShifts.ts)
- saisie carburant (`useCreateFuelEntry`) dans [`src/hooks/useFuel.ts`](../src/hooks/useFuel.ts)

**Complément PWA** : shell, service worker et fiche véhicule — voir [`qa-pwa-offline.md`](qa-pwa-offline.md).

---

## Fiche de campagne

| Champ | Valeur |
|--------|--------|
| Date | |
| Testeur | |
| Build / commit / tag | |
| URL (preview, staging, prod) | |

| # | Scénario | OK | Notes |
|---|----------|:--:|-------|
| 1 | Offline → file signalement incident | [ ] | |
| 2 | Offline → file créneau (start/close) | [ ] | |
| 3 | Offline → file carburant | [ ] | |
| 4 | Online → replay automatique (incident + start + close + fuel) | [ ] | |
| 5 | APK + logcat + stabilité | [ ] | |
| 6 | Slow 3G → hero / assets | [ ] | |

---

## 1. Test offline (Network → Offline)

**Objectif** : soumettre le formulaire **Déclarer un incident** avec le réseau coupé → enregistrement local **sans** attendre le serveur.

**Étapes**

1. Ouvrir l’app (session **connectée**, utilisateur avec rôle autorisé : driver, organizer, manager, mechanic).
2. Aller sur la route de déclaration d’incident (ex. `/dashboard/declare-incident` ou équivalent selon les routes).
3. **DevTools → Network → Offline** (pas seulement le throttling : voir note ci-dessous).
4. Remplir et **valider** le formulaire.

**Critères de succès**

- Toast du type **« Enregistré hors ligne »** / message indiquant que le signalement sera synchronisé à la reconnexion.
- Optionnel : écran **Compte** — indicateur de synchro en attente (`useOfflineSyncStatus`).

**Références code** : [`useDeclareIncident`](../src/hooks/useIncidents.ts), [`OfflineQueueService`](../src/services/offlineQueue.service.ts), [`offline-queue.storage`](../src/lib/storage/offline-queue.storage.ts).

**Attention** : avec **Slow 3G** seul, `navigator.onLine` reste souvent `true` : la branche « file hors ligne » peut ne pas s’exécuter (les requêtes échouent autrement). Pour ce test, utiliser **Offline** explicitement.

---

## 2. Test offline créneau (start puis close)

**Objectif** : valider la mise en file locale du démarrage et de la clôture d’un créneau.

**Étapes**

1. Session conducteur active.
2. **Network → Offline**.
3. Démarrer un créneau depuis l’UI.
4. Clôturer le créneau (preuve + montant + km).

**Critères de succès**

- Toast hors ligne sur start/close.
- Aucun appel Supabase direct côté composant de clôture.
- Les données sont en file et rejouées à la reconnexion.

---

## 3. Test offline carburant

**Objectif** : valider la mise en file locale d’une saisie carburant.

**Étapes**

1. Session conducteur active.
2. **Network → Offline**.
3. Saisir un plein (litres, montant, odomètre, station optionnelle).
4. Soumettre.

**Critères de succès**

- Toast « Saisie hors ligne ».
- Job `fuel:create` présent dans la file locale.

---

## 4. Test replay global (repasser en ligne)

**Objectif** : au retour réseau, envoi automatique de la file et mise à jour des données.

**Étapes**

1. Reprendre la session avec jobs en attente (incident + start + close + fuel).
2. **DevTools → Network → Online** (ou réactiver le réseau système).
3. Observer l’UI (quelques secondes).

**Critères de succès**

- Toast **« Synchronisation »** (ou **« Synchronisation partielle »** si un envoi échoue).
- Invalidation cohérente des caches: `incidents`, `active-shift`, `driver-shifts`, `fuel-entries`, `operations`.
- Les jobs sont supprimés de la file après succès.

**Références code** : [`OfflinePendingSyncBridge`](../src/components/OfflinePendingSyncBridge.tsx), [`runOfflineSyncOnce`](../src/services/offlineSyncOrchestrator.service.ts).

**Tests automatisés** : `npm test` — fichier [`src/test/offlineSyncOrchestrator.service.test.ts`](../src/test/offlineSyncOrchestrator.service.test.ts).

---

## 5. Test appareil (APK, logcat, mémoire / crash)

**Objectif** : valider l’APK release sur un appareil ou émulateur et collecter les logs applicatifs.

**Installation**

```bash
adb install app-release.apk
```

**Logs « E-Samba »**

Les messages applicatifs utilisent le préfixe **`[Flotte E-Samba]`** ([`src/lib/logging/appLogger.ts`](../src/lib/logging/appLogger.ts)). Sous WebView Capacitor, les `console.*` peuvent apparaître avec des tags système (**Chromium**, **console**).

PowerShell (Windows) :

```powershell
adb logcat | Select-String -Pattern "Flotte E-Samba","E-Samba","chromium","Capacitor" -CaseSensitive:$false
```

Bash :

```bash
adb logcat | grep -iE "Flotte E-Samba|E-Samba|chromium|Capacitor"
```

Si aucun résultat : élargir le filtre ou vérifier que le code exécute bien des `logInfo` / `logError` sur le chemin testé.

**Mémoire et crash**

- **Android Studio Profiler** ou `adb shell dumpsys meminfo <package>`
- Crashes : logcat + **Sentry** si `VITE_SENTRY_DSN` est configuré en build.

---

## 6. Test Slow 3G (landing et images)

**Objectif** : vérifier le comportement réseau dégradé et le **bon candidat d’image** (poids / dimensions).

**Étapes**

1. **DevTools → Network → Throttling → Slow 3G** (ou Fast 3G selon la politique interne).
2. Ouvrir la **page d’accueil / landing** (hero).
3. Onglet **Network** : identifier la requête image du hero (AVIF / WebP selon le navigateur).

**Critères de succès**

- Chargement progressif acceptable (pas de blocage prolongé sans feedback).
- Pour une largeur de viewport mobile, le navigateur ne charge **pas systématiquement** la variante la plus lourde si une plus petite convient (`srcset`).

**Référence code** : [`src/components/landing/HeroSection.tsx`](../src/components/landing/HeroSection.tsx) (`<picture>`, largeurs 768 / 1280 / 1920).

**Optionnel** : `npm run lighthouse:ci:local` si configuré pour des métriques LCP sur l’URL cible.

---

## Synthèse des fichiers utiles

| Sujet | Fichier |
|--------|---------|
| Sync au retour ligne | `src/components/OfflinePendingSyncBridge.tsx` |
| Orchestration file | `src/services/offlineSyncOrchestrator.service.ts` |
| État synchro UI | `src/hooks/useOfflineSyncStatus.ts` |
| Réseau `online` / `offline` | `src/features/account/hooks/useNetworkOnline.ts` |
| Logs app | `src/lib/logging/appLogger.ts` |
