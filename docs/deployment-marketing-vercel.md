# Déploiement hub marketing (Astro)

Site statique dans [`apps/marketing/`](../apps/marketing/) — guides, solutions et fonctionnalités pour l'acquisition SEO flotte / CEMAC.

## Phase A — Sous-domaine (recommandé au démarrage)

### État déployé (automatisation CLI)

| Élément | Valeur |
|---------|--------|
| Projet Vercel | `atipik/esamba-marketing` |
| URL production | [https://marketing.e-samba.com](https://marketing.e-samba.com) |
| Root Directory (Git) | `apps/marketing` |
| Repo GitHub | `atipikrh/smart-fleet-africa` |
| Variables marketing | `PUBLIC_SITE_URL`, `PUBLIC_APP_URL` |
| Variable SPA | `VITE_MARKETING_URL=https://marketing.e-samba.com` (production) |

Relance locale : `npm run marketing:deploy` ou `scripts/deploy-marketing-vercel.ps1`.

### Projet Vercel

| Paramètre | Valeur |
|-----------|--------|
| Root Directory | `apps/marketing` |
| Framework | Astro |
| Build | `npm run build` |
| Output | `dist` |
| Node | 22.x |

### Variables d'environnement

| Variable | Exemple |
|----------|---------|
| `PUBLIC_SITE_URL` | `https://marketing.e-samba.com` |
| `PUBLIC_APP_URL` | `https://www.e-samba.com` |

### DNS

Enregistrement `marketing` (ou `ressources`) en **CNAME** vers `cname.vercel-dns.com`.

### SPA produit

Dans le projet Vercel de la SPA, ajouter :

```
VITE_MARKETING_URL=https://marketing.e-samba.com
```

Les liens « Guides & ressources » du footer et de la navbar utilisent [`src/lib/marketing-url.ts`](../src/lib/marketing-url.ts).

### Redirect blog (SPA)

Dans [`vercel.json`](../vercel.json) à la racine :

- `/blog` → `https://marketing.e-samba.com/guides` (301)

## Phase B — Fusion sous `www.e-samba.com`

Objectif : une seule autorité de domaine pour le contenu indexable.

1. Déployer le marketing sur le **même** domaine (second projet ou build combiné).
2. Dans `vercel.json` de la SPA, ajouter des **rewrites** *avant* le catch-all SPA :

```json
{
  "source": "/guides/:path*",
  "destination": "https://<deployment-marketing>/guides/:path*"
},
{
  "source": "/solutions/:path*",
  "destination": "https://<deployment-marketing>/solutions/:path*"
},
{
  "source": "/fonctionnalites/:path*",
  "destination": "https://<deployment-marketing>/fonctionnalites/:path*"
}
```

3. Mettre `VITE_MARKETING_URL=https://www.e-samba.com` (chemins relatifs possibles si même origine).
4. Soumettre [`public/sitemap-index.xml`](../public/sitemap-index.xml) dans Search Console.

### Vérification crawlers

```bash
curl -A Googlebot -I https://www.e-samba.com/guides/pilotage-flotte-ia
```

Le HTML doit contenir le `<title>` et le corps article (pas seulement `div#root`).

## Sitemaps

| Fichier | Rôle |
|---------|------|
| `public/sitemap-index.xml` (SPA) | Index : app + marketing |
| `public/sitemap-app.xml` (SPA) | Pages corporate / acquisition |
| `dist/sitemap-index.xml` (Astro) | Toutes les URLs marketing |

[`public/robots.txt`](../public/robots.txt) référence `sitemap-index.xml`.

## SEO technique (marketing)

- JSON-LD : `Article`, `BreadcrumbList` via [`SeoHead.astro`](../apps/marketing/src/components/SeoHead.astro) et [`Breadcrumb.astro`](../apps/marketing/src/components/Breadcrumb.astro).
- Sitemap généré par `@astrojs/sitemap` au build.
- Contenu MDX versionné en Git (relecture PR avant indexation).
