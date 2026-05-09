# SEO – Configuration et checklist

## Checklist rapide

| Critère | Statut |
|--------|--------|
| Une version (www) + redirections 301 | OK – `vercel.json` : non-www → www |
| Canonical = URL de la page | OK – Pré-rendu par route (build) + rewrites Vercel + `PageSEO` en JS |
| Pas de noindex sur pages publiques | OK |
| robots.txt n’interdit pas / | OK – `Allow: /` |
| HTML initial contient du contenu | Partiel – Meta + canonical par route (pré-rendu) ; corps = `div#root` + script + `<noscript>`. Pas de SSR/SSG. |
| Sitemap soumis Search Console | À faire manuellement |

## État actuel et limites

### Canonical = URL de la page

- **HTML initial** : Pour les routes listées dans `ROUTE_META` et dans `vercel.json` (rewrites), le build génère un `index.html` par route (`scripts/vite-plugin-prerender-seo.ts`) avec le bon canonical, title, description et og:url. Vercel sert ce fichier pour l'URL concernée. La racine `/` et toute URL non listée tombent sur le catch-all et reçoivent `dist/index.html` (canonical = home).
- **Après hydratation** : `PageSEO` met à jour en JS le canonical, title, description et og:url à chaque changement de route.
- **Limite** : Les URLs qui ne sont pas dans les rewrites (ex. nouvelle route non encore ajoutée) reçoivent le HTML de la home : canonical et meta restent ceux de la home. Les crawlers qui n'exécutent pas le JS voient quand même le bon canonical pour toutes les URLs ayant un rewrite (ils reçoivent le fichier pré-rendu).

### HTML initial (SPA, pas de SSR/SSG)

- **Contenu** : Le corps est uniquement `<div id="root"></div>`, le script d'entrée et un bloc `<noscript>` avec un court texte descriptif. Les métas (title, description, canonical, og, twitter) sont présentes dans le `<head>` : pour la home dans `index.html` source ; pour les autres routes, dans les fichiers générés au build (un HTML par route).
- **Limite** : Pas de contenu de page dans le HTML initial ; tout le contenu des pages est rendu côté client. Pour un contenu riche dans le premier byte, il faudrait du pré-rendu ciblé ou une migration SSR/SSG.

## Contenu dans le HTML initial (SPA)

L’app est une SPA Vite : le corps de la page est rendu côté client. Le HTML initial contient :

- Titre, description, canonical et balises OG par route (pré-rendu au build pour chaque route listée dans `ROUTE_META` ; rewrites Vercel servent le bon fichier).
- Un bloc `<noscript>` avec un court texte descriptif pour les crawlers sans JS.

Pour aller plus loin (contenu riche dans le HTML initial), options possibles :

- Pré-rendu ciblé (ex. `vite-plugin-ssr` ou script headless) pour les routes publiques `/` et `/auth`.
- Migration vers un framework SSR/SSG (Next.js, Astro) pour les pages à fort enjeu SEO.

## Search Console

1. Créer ou vérifier la propriété pour `https://www.e-samba.com`.
2. Soumettre le sitemap : `https://www.e-samba.com/sitemap.xml`.
3. Vérifier que le sitemap est bien pris en compte et sans erreur.

Le sitemap est déclaré dans `public/robots.txt` et le fichier est généré dans `public/sitemap.xml`.

## URL de base (canonical, og:url)

La base utilisée pour les URLs canoniques et og:url est :

- En production : `VITE_APP_URL` (à définir dans les variables d’environnement du déploiement).
- Défaut si non défini : `https://www.e-samba.com`.

**À faire en production** : définir `VITE_APP_URL=https://www.e-samba.com` dans la configuration Vercel (ou équivalent) pour rester cohérent avec la version canonique du site (www).

## Fichiers concernés

- `vercel.json` – Redirections 301, rewrites par route, headers.
- `src/components/PageSEO.tsx` – Mise à jour dynamique title, description, canonical, og:url.
- `src/lib/site.ts` – `SITE_BASE_URL`, `ROUTE_META`, `getCanonicalUrl`.
- `scripts/vite-plugin-prerender-seo.ts` – Génération d’un `index.html` par route au build avec canonical et meta corrects.
- `public/robots.txt` – Allow / et référence au sitemap.
- `public/sitemap.xml` – Liste des URLs.
