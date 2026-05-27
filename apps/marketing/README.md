# Site marketing E-Samba (hub contenu)

Site statique **Astro + MDX** pour les guides, landings verticales et pages fonctionnalités — séparé de la SPA produit (`/` racine).

## Commandes

```bash
# Depuis la racine du monorepo
npm run marketing:dev
npm run marketing:build

# Ou depuis ce dossier
npm run dev
npm run build
```

## URLs

| Zone | Exemple |
|------|---------|
| Guides | `/guides`, `/guides/pilotage-flotte` |
| Solutions | `/solutions/pme-logistique` |
| Fonctionnalités | `/fonctionnalites/carburant` |

## Déploiement (Phase A)

1. Créer un **projet Vercel** avec *Root Directory* = `apps/marketing`.
2. Variables : `PUBLIC_SITE_URL=https://marketing.e-samba.com`, `PUBLIC_APP_URL=https://www.e-samba.com`.
3. DNS : `marketing.e-samba.com` → CNAME Vercel.
4. SPA : définir `VITE_MARKETING_URL=https://marketing.e-samba.com` (liens footer / navbar).

Voir [docs/deployment-marketing-vercel.md](../../docs/deployment-marketing-vercel.md) pour la fusion Phase B sous `www.e-samba.com`.

## Contenu

Les fichiers MDX sont dans `src/content/`. Régénérer les squelettes :

```bash
node scripts/generate-mdx-stubs.mjs
```
