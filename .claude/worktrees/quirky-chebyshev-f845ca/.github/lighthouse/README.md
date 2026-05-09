# Lighthouse CI — Smart Fleet Africa

## Fichiers

| Fichier | Rôle |
|--------|------|
| `lighthouserc.json` | **Profil par défaut** (CI + local) : perf / a11y sur `/`, `/login`, `/auth`. Gates **error** : CLS uniquement ; LCP et score perf en **warn**. |
| `lighthouserc.strict.json` | **Profil strict** (opt-in) : ajoute en **error** le score perf (médiane ≥ 0,75) et le LCP (médiane ≤ 2,5 s), en plus du CLS. À activer quand les médianes CI sont stables sur plusieurs semaines. |
| `lighthouserc-seo.json` | **SEO** : uniquement la page d’**accueil** `/`. Les écrans `/login` et `/auth` sont souvent pauvres en signaux SEO ; les inclure ici ferait baisser artificiellement le score ou ferait échouer des assertions inutilement. |
| `budget.json` | Budget réseau (référence treosh / audit complet). |

## Activer le profil strict en CI

1. Vérifier sur plusieurs exécutions que perf ≥ 0,75 et LCP ≤ 2,5 s en médiane sur les trois URLs.
2. Dans `.github/workflows/lighthouse-ci.yml` et l’étape correspondante de `lighthouse.yml`, remplacer `--config=.github/lighthouse/lighthouserc.json` par `--config=.github/lighthouse/lighthouserc.strict.json`, ou factoriser via une variable dépôt `LHCI_CONFIG` (valeur par défaut : `lighthouserc.json`).

En local : `npm run lighthouse:ci:strict`.

## SEO : passage en `error`

Dans `lighthouserc-seo.json`, remplacer `"warn"` par `"error"` pour `categories:seo` lorsque le score médian sur `/` reste durablement au-dessus du seuil (0,85).

## Ajouter d’URLs « marketing » au SEO

Si de nouvelles pages statiques publiques (landing, blog, etc.) deviennent pertinentes pour le SEO, ajouter leurs URLs dans `lighthouserc-seo.json` **sans** y mettre les routes purement applicatives (login, auth, app authentifiée).
