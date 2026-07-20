# Semaine 2 - Bridge auth Clerk vers Supabase

## Objectif

Mettre en service une authentification unifiée Clerk -> Supabase (claims compatibles RLS).

## Livrables attendus

- [ ] Mapping claims JWT validé (user id, org/fleet context, rôles).
- [ ] Parcours login/logout/refresh validé web + mobile.
- [ ] Suppression des fallbacks auth non cibles en staging.
- [ ] Tests de cohérence identité (Clerk user == membership Supabase).

## Vérifications

- [ ] Le token transmis à Supabase contient les claims exigés par les policies.
- [ ] Les parcours d'onboarding et post-login restent cohérents.
- [ ] Le mode mock n'est pas activable sur les domaines staging/prod.

## Observabilité minimale

- [ ] Dashboard de taux succès login.
- [ ] Log des erreurs auth groupées par cause (`token_invalid`, `membership_missing`, `policy_denied`).

## Go

- [ ] Taux succès login >= 99% sur jeux de tests de staging.
- [ ] Aucun fallback non contrôlé en build staging.

## No-Go (bloquant)

- [ ] Incohérence d'identité entre le provider auth et les tables de membership.
