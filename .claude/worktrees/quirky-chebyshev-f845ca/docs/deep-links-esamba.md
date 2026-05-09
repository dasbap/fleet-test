# Deep links — Flotte E-Samba

## Schéma

| Lien | Écran SPA |
|------|-----------|
| `esamba://alerts` | `/dashboard/alerts` (liste) |
| `esamba://fleet` | `/dashboard/vehicles` (liste) |
| `esamba://alerts/:id` | `/dashboard/alerts/:id` |
| `esamba://fleet/:id` | `/dashboard/vehicles/:id` |
| `esamba://operations/mission/:id` | `/dashboard/operations/mission/:id` |
| `esamba://operations/intervention/:id` | `/dashboard/operations/intervention/:id` |
| `esamba://operations/:id?kind=mission` ou `?type=mission` | Mission |
| `esamba://operations/:id?kind=intervention` ou `?type=intervention` (ou `ticket`) | Ticket d’intervention |
| `esamba://operations/mission:id` | Idem mission (préfixe dans le segment) |
| `esamba://operations/intervention:id` ou `ticket:id` | Idem intervention |

Un UUID seul dans `esamba://operations/:id` **sans** `?kind=` / `?type=` ni préfixe `mission:` est **refusé** (ambiguïté mission vs ticket). Pour les notifications push, préférer `buildEsambaDeepLinkUrl` (chemins explicites) ou `buildEsambaOperationsDeepLink(id, kind)`.

## Implémentation

- **Parsing** : `parseDeepLink` (`src/lib/deepLinks/parseDeepLink.ts`).
- **Navigation** : `navigateFromDeepLinkUrl` + `DeepLinkListener` (`src/components/navigation/DeepLinkListener.tsx`) — Capacitor `appUrlOpen` / `getLaunchUrl`, événements `window` pour le push.
- **Façade** : `DeepLinkService` (`src/services/deep-link.service.ts`).

## Debug

- Logs préfixés `[Flotte E-Samba][DeepLink]`.
- En console navigateur : `window.__ESAMBA_DEBUG_DEEPLINK__ = true` pour forcer les traces détaillées hors dev.

## Notifications push (préparation)

- `deepLinkService.dispatchFromPushPayload({ esambaUrl })`, `{ internalPath: '/dashboard/...' }` ou `{ deepLinkTarget: { screen: 'alert', id: '…' } }` (ou `{ screen: 'alerts_list' }` / `{ screen: 'fleet_list' }` pour les listes) déclenchent la même navigation que l’ouverture depuis un lien natif.
- Helpers : `deepLinkService.buildPushUrl({ screen, id })` (ou sans `id` pour `alerts_list` / `fleet_list`), `deepLinkService.buildOperationsPushUrl(id, 'mission' | 'intervention')`.
- File d’attente optionnelle : `queuePendingDeepLink` / `consumePendingDeepLink` (`src/lib/deepLinks/pendingDeepLink.ts`) si le plugin livre le payload avant le montage du routeur.

## Après modification native

```bash
npm run mobile:prepare
```
