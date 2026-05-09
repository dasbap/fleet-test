# Deep links — module `lib/deepLinks`

Documentation détaillée : [`docs/deep-links-esamba.md`](../../../docs/deep-links-esamba.md).

**Fichiers**

| Fichier | Rôle |
|---------|------|
| `deepLinkConfig.ts` | Schéma `esamba`, noms d’événements `window` pour push / bridge |
| `parseDeepLink.ts` | Parse et construction d’URLs `esamba://` |
| `deepLinkNavigation.ts` | Conversion → routes React (`ROUTE_PATHS`) |
| `deepLinkLogger.ts` | Logs `[Flotte E-Samba][DeepLink]` |
| `pendingDeepLink.ts` | File session si navigation pas encore prête |

**Entrée UI** : `DeepLinkListener` sous `BrowserRouter` (`App.tsx`). **Façade** : `deepLinkService` (`src/services/deep-link.service.ts`).
