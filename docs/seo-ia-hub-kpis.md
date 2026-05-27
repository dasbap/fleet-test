# KPIs hub SEO + IA — e-samba.com

## UTM (démo / contact)

Paramètres par défaut (`src/lib/seo-utm.ts`) :

| Paramètre | Valeur |
|-----------|--------|
| `utm_source` | `seo-ia-hub` |
| `utm_medium` | `content` |
| `utm_campaign` | `hub-seo-ia-2025` |
| `utm_content` | slug de l’article |

Helper : `buildSeoIaCtaUrl('/#contact', slug)`.

## Google Search Console

1. Propriété : `https://www.e-samba.com`
2. Sitemap : `https://www.e-samba.com/sitemap.xml`
3. Filtre URL : `https://www.e-samba.com/ressources/seo-ia`

## Cibles à 6 mois

| Métrique | Cible |
|----------|--------|
| Impressions GSC (préfixe hub) | +15k / mois |
| Pages indexées hub | 15–18 |
| CTR moyen | > 2,5 % |
| Leads démo (UTM `seo-ia-hub`) | 5–15 / mois |
| Requêtes top 10 (P1/P2) | ≥ 5 |

## Revue mensuelle

- Top pages par clics et impressions
- Requêtes à fort CTR à renforcer (maillage)
- Articles à mettre à jour (`dateModified` dans le contenu)
- Conversions démo par `utm_content`

## Sitemap

Les routes `/dashboard/*` sont **exclues** du sitemap public (dilution SEO). Régénération :

```bash
npm run sitemap:generate
```
