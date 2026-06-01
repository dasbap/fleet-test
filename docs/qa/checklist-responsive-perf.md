# Checklist QA — responsive et performance

## Viewports (obligatoire)

- [ ] 320px — iPhone SE / petits Android
- [ ] 360px — Android courant
- [ ] 375px — iPhone classique
- [ ] 390px — iPhone 14/15
- [ ] 412px — Pixel
- [ ] 768px — tablette portrait
- [ ] 1024px — tablette paysage / petit desktop
- [ ] 1440px — desktop

## Parcours P0

- [ ] `/` — LCP < 2,5 s (throttling 3G)
- [ ] `/dashboard` — ≤ 3 requêtes REST au premier paint (snapshot RPC)
- [ ] `/dashboard/drivers` — cartes mobile, pas de scroll horizontal
- [ ] `/dashboard/maintenance` — idem
- [ ] Accueil Capacitor — `MobileHomeDashboard` (pas layout desktop)
- [ ] Pull-to-refresh accueil / alertes / flotte

## Web Vitals

- [ ] CLS ≤ 0,05
- [ ] INP ≤ 200 ms (interaction filtre / onglet)
- [ ] Pas de régression bundle : `npm run check:bundle-budget:critical`

## Commandes

```bash
npm run analyze:bundle:critical
npm run lighthouse:ci:dashboard
node scripts/generate-route-inventory.mjs
```
