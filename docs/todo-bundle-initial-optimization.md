# Dette technique — optimisation du bundle JS initial

## Contexte

À la date de ce document, le bundle JS initial (somme gzip des scripts
référencés dans `dist/index.html` : entry + `modulepreload`) pèse **~322,7 Ko
gzip** sur les routes `/` et `/auth`.

Le budget historique était fixé à **220 Ko** (cible performance 2G/3G Afrique,
P2 du projet). Le budget a été **temporairement relevé à 330 Ko** pour
débloquer le pipeline CI `main` (commit `dd90116`).

| Route  | Poids actuel (gzip) | Budget actuel | Cible  |
| ------ | ------------------: | ------------: | -----: |
| `/`    |            322,7 Ko |        330 Ko | 220 Ko |
| `/auth` |           322,7 Ko |        330 Ko | 240 Ko |

## Fichiers concernés

- [`.github/workflows/lighthouse.yml`](../.github/workflows/lighthouse.yml) — variable `BUNDLE_BUDGET_INITIAL_GZIP_KB`.
- [`.github/workflows/publish-npm.yml`](../.github/workflows/publish-npm.yml) — même variable.
- [`scripts/check-initial-js-budget.mjs`](../scripts/check-initial-js-budget.mjs) — défaut du script.
- [`scripts/check-critical-route-budgets.mjs`](../scripts/check-critical-route-budgets.mjs) — `defaultBudgets`.

## Leviers identifiés

1. **Cartes (`vendor-maps`)** : ~1727 Ko non-gzip / ~384 Ko brotli.
   - Leaflet + dépendances chargés dans le graphe principal via
     `FleetLiveMapPage` ou un composant atterrissage.
   - Action : imposer un `React.lazy` strict et différer l'import de Leaflet
     au premier affichage de la carte (hook `useLeafletLoader`).

2. **Exports tableurs (`xlsx`)** : ~419 Ko / ~116 Ko brotli.
   - Charger dynamiquement au premier clic « Exporter Excel ».
   - Alternative : remplacer par un service serveur (Edge Function) pour les
     gros exports (> 5000 lignes).

3. **PDF (`jspdf.es.min`)** : ~377 Ko / ~104 Ko brotli.
   - Même traitement : `await import("jspdf")` dans le handler d'export.

4. **Analytics (`vendor-analytics`)** : ~172 Ko / ~50 Ko brotli.
   - Charger après `requestIdleCallback` ou sur interaction utilisateur.

5. **`modulepreload` Vite** : vérifier que `build.modulePreload.resolveDependencies`
   limite bien les preloads aux chunks critiques route par route.

## Critère de sortie de dette

- Ramener `/` et `/auth` à **≤ 220 Ko gzip** (budget historique).
- Rétablir `BUNDLE_BUDGET_INITIAL_GZIP_KB: "220"` dans les workflows.
- Restaurer `{ route: "/", maxGzipKb: 220 }` et `{ route: "/auth", maxGzipKb: 240 }`
  dans `defaultBudgets` de `scripts/check-critical-route-budgets.mjs`.
- Mesure manuelle : `npm run build && npm run check:bundle-budget:critical`.

## Statut

- [ ] Audit détaillé du graphe de preload (`vite-bundle-visualizer`).
- [ ] Lazy-load cartes.
- [ ] Lazy-load XLSX.
- [ ] Lazy-load jsPDF.
- [ ] Reporter Analytics.
- [ ] Retour budget à 220 Ko + fermeture de cette dette.
