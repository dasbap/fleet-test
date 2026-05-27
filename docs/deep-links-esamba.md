# Deep links — Flotte E-Samba

## Schéma

| Lien | Écran SPA |
|------|-----------|
| `esamba://alerts` | `/dashboard/alerts` (liste) |
| `esamba://fleet` | `/dashboard/vehicles` (liste) |
| `esamba://tutorials` | `/dashboard/tutorials` (liste guides) |
| `esamba://tutorials/:id` | `/dashboard/tutorials/:id` (lecteur, ex. `tuto-03`) |
| `esamba://alerts/:id` | `/dashboard/alerts/:id` |
| `esamba://fleet/:id` | `/dashboard/vehicles/:id` |
| `esamba://operations/mission/:id` | `/dashboard/operations/mission/:id` |
| `esamba://operations/intervention/:id` | `/dashboard/operations/intervention/:id` |
| `esamba://operations/:id?kind=mission` ou `?type=mission` | Mission |
| `esamba://operations/:id?kind=intervention` ou `?type=intervention` (ou `ticket`) | Ticket d’intervention |
| `esamba://operations/mission:id` | Idem mission (préfixe dans le segment) |
| `esamba://operations/intervention:id` ou `ticket:id` | Idem intervention |
| `esamba://auth/callback?code=…` | `/auth/callback` (PKCE Supabase) |
| `esamba://auth/update-password?…` | `/auth/update-password` |
| `https://www.e-samba.com/dashboard/...` | Chemin SPA équivalent (App Links / Universal Links) |

Un UUID seul dans `esamba://operations/:id` **sans** `?kind=` / `?type=` ni préfixe `mission:` est **refusé** (ambiguïté mission vs ticket). Pour les notifications push, préférer `buildEsambaDeepLinkUrl` (chemins explicites) ou `buildEsambaOperationsDeepLink(id, kind)`.

Fichiers domaine : [`public/.well-known/assetlinks.json`](../public/.well-known/assetlinks.json) (Android), [`public/.well-known/apple-app-site-association`](../public/.well-known/apple-app-site-association) (iOS — remplacer `TEAMID` par l’équipe Apple).

## Implémentation

- **Parsing** : `parseDeepLink` (`src/lib/deepLinks/parseDeepLink.ts`).
- **Navigation** : `navigateFromDeepLinkUrl` + `DeepLinkListener` (`src/components/navigation/DeepLinkListener.tsx`) — Capacitor `appUrlOpen` / `getLaunchUrl`, événements `window` pour le push.
- **Façade** : `DeepLinkService` (`src/services/deep-link.service.ts`).

## Debug

- Logs préfixés `[Flotte E-Samba][DeepLink]`.
- En console navigateur : `window.__ESAMBA_DEBUG_DEEPLINK__ = true` pour forcer les traces détaillées hors dev.

## Notifications push (préparation)

- `deepLinkService.dispatchFromPushPayload({ esambaUrl })`, `{ internalPath: '/dashboard/...' }` ou `{ deepLinkTarget: { screen: 'alert', id: '…' } }` (ou `{ screen: 'alerts_list' }` / `{ screen: 'fleet_list' }` / `{ screen: 'tutorials_list' }` pour les listes) déclenchent la même navigation que l’ouverture depuis un lien natif.
- Helpers : `deepLinkService.buildPushUrl({ screen, id })` (ou sans `id` pour `alerts_list` / `fleet_list` / `tutorials_list`), `buildEsambaDeepLinkUrl({ screen: 'tutorial', id: 'tuto-03' })`, `deepLinkService.buildOperationsPushUrl(id, 'mission' | 'intervention')`.
- File d’attente optionnelle : `queuePendingDeepLink` / `consumePendingDeepLink` (`src/lib/deepLinks/pendingDeepLink.ts`) si le plugin livre le payload avant le montage du routeur.

## QA Android (ADB, Windows)

Scripts à la racine du dépôt (résolution `adb` via [`scripts/adb-env.bat`](../scripts/adb-env.bat)) :

| Script | Usage |
|--------|--------|
| `rebuild-and-install.bat` | `build:capacitor` + `cap sync` + APK debug + install |
| `rebuild-and-install.bat --qa` | Idem puis ouvre `esamba://tutorials` et `esamba://tutorials/tuto-03` |
| `rebuild-and-install.bat --qa-full` | Idem puis `adb-qa-tutorials.bat` (non-régression alerts/fleet) |
| `adb-qa-tutorials.bat` | Suite deep links tutoriels + logcat filtré |

Push Git optionnel : `rebuild-and-install.bat push` ou `set ESAMBA_PUSH=1`.

## Après modification native

```bash
npm run mobile:prepare
```
