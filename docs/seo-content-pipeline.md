# Pipeline de contenu SEO + IA (hub `/ressources/seo-ia/`)

## Objectif

Produire et publier des articles du hub éducatif sans thin content, avec relecture humaine et métadonnées SEO correctes (pré-rendu Vite).

## Étapes

1. **SERP** — Export manuel ou API (PAA, entités, types de pages).
2. **Brief JSON** — Fichier `brief-{slug}.json` (voir modèles dans `/ressources/seo-ia/modeles/`).
3. **Rédaction** — ChatGPT ou Claude avec le prompt système ci-dessous.
4. **Intégration** — Ajouter ou mettre à jour l’entrée dans `src/content/seo-ia/` (clusters, pillars ou modeles).
5. **Pré-rendu** — `npm run build` régénère les `index.html` par route via `ROUTE_META`.
6. **Sitemap** — `npm run sitemap:generate` puis soumission Search Console.
7. **QA** — Grille score (page calculateur sur `score-seo-contenu-genere-ia`) + Lighthouse SEO.

## Prompt système (réutilisable)

```
Rôle : rédacteur SEO B2B SaaS (FR).
Entrées JSON : {primary_kw, secondary_kws[], intent, serp_entities[], paa[], brand_rules}
Contraintes : ne pas présenter E-Samba comme outil SEO ; 1 encart produit flotte max ; E-E-A-T ; FAQ 5 questions si pertinent.
Sortie : sections avec H2, paragraphes 40–80 mots après chaque titre (GEO).
```

## Fichiers concernés

| Fichier | Rôle |
|---------|------|
| `src/content/seo-ia/*.ts` | Contenu des articles |
| `src/lib/seo-resources.ts` | Chemins canoniques + `ROUTE_META` |
| `src/lib/site.ts` | Fusion `ROUTE_META` build |
| `src/pages/resources/*` | Pages React du hub |
| `scripts/generate-sitemap.mjs` | Sitemap marketing |
| `docs/seo-ia-hub-kpis.md` | KPIs et UTM |

## Cursor

1. Ouvrir le dépôt, créer une branche `content/seo-ia-{slug}`.
2. Copier un article existant comme modèle dans `clusters.ts`.
3. Lancer `npm run lint` et `npm test`.
4. Vérifier localement : `npm run dev` → `/ressources/seo-ia/{slug}`.

## Garde-fous

- Pas de pages quasi-dupliquées (spin ville/pays).
- `canonical` unique par URL.
- Ne pas indexer les brouillons (`noindex` si page test).
