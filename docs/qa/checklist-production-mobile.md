# Checklist production — web + Capacitor

## Avant release

- [ ] `npm run quality` (lint + typecheck + tests)
- [ ] `npm run build:capacitor` + `npm run cap:sync`
- [ ] `npm run verify:capacitor-config`
- [ ] Migrations Supabase appliquées (`get_dashboard_snapshot`)
- [ ] `node scripts/check-no-supabase-in-ui.mjs`
- [ ] `node scripts/sync-design-tokens.mjs`

## Android / iOS

- [ ] Splash : transition `#00C853` → UI sombre `#0f0f0f`
- [ ] Safe area : pas de contenu sous encoche / tab bar
- [ ] Clavier : formulaires terrain sans champ masqué
- [ ] Bouton retour système (détail véhicule)
- [ ] Test appareil entrée de gamme (RAM ≤ 3 Go)

## Réseau Afrique

- [ ] Mode avion : données dashboard depuis cache React Query
- [ ] 3G simulé : pas de polling < 60 s sur connexion lente
- [ ] Tutoriels : pas d’autoplay vidéo hors WiFi

## Lighthouse (échantillon dashboard)

```bash
npm run lighthouse:ci:dashboard
```

Seuils : perf/a11y ≥ 0,90 (warn), CLS error ≤ 0,05.
