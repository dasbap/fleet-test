# Architecture cible (principes et options)

Ce document fixe les **objectifs d’architecture** et les **options d’évolution** pour le dépôt smart-fleet-africa. Il complète [CURRENT_ARCHITECTURE.md](./CURRENT_ARCHITECTURE.md) (vérité immédiate du code) sans imposer de migration non tranchée par le produit.

## Principes cibles (transverses)

1. **Une source de vérité pour le schéma runtime** : les migrations **Supabase** (`supabase/migrations/`) et la baseline alignée avec l’environnement déployé.
2. **Sécurité par défaut** : RLS PostgreSQL pour tout accès multi-tenant ; le client ne sert pas de filet de sécurité unique.
3. **Séparation des couches** : présentation → hooks React Query → services → repositories → Supabase (voir [docs/ARCHITECTURE.md](../ARCHITECTURE.md)).
4. **Auth explicite** : un chemin par défaut documenté (**Supabase Auth**) et un mode **mock** borné pour le développement (voir [AUTH_FLOW.md](./AUTH_FLOW.md)).
5. **Observabilité** : erreurs front (Sentry chargé en différé dans [src/main.tsx](../../src/main.tsx)), analytics optionnelle (PostHog), logs structurés pour actions critiques.
6. **Facturation traçable** : états de paiement persistés, idempotence, webhooks ou traitements async documentés quand ils existent (voir [PAYMENTS.md](./PAYMENTS.md)).

## Décision d’exécution : approche hybride (mai 2026)

**Choix retenu** : **hybride** — conserver **Supabase Edge Functions** pour les webhooks et jobs déjà hébergés sur le projet, et introduire un **BFF Node** dans le dépôt (`src/server/`) pour les flux qui bénéficient d’un runtime Node (validation Zod centralisée, orchestration, endpoints alignés sur le front Vite).

| Critère | Edge Functions | BFF Node (`src/server`) |
| --- | --- | --- |
| Secrets PSP / webhooks signés proches de Supabase | Favorable | Possible (secret `PAYMENTS_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`) |
| Transactions longues, libs lourdes | Limité (timeouts Deno) | Favorable |
| Même repo + types partagés | Oui | Oui (chemins `@/types`, `@/lib/billing`) |
| Ops | Déjà en place (`supabase/functions`) | Process séparé (`npm run dev:api`) + proxy Vite optionnel |

**Critères de placement** : privilégier Edge quand le flux est court, stateless, et colocalisé aux triggers Supabase ; privilégier le BFF quand plusieurs appels DB + validation + format de réponse stable doivent être exposés au front sous `/api/*` avec le **JWT utilisateur** (RLS inchangée via client anon + `Authorization: Bearer`).

## Option simple (court terme, faible risque)

- **Stabiliser** la stack Vite + React Router + Supabase.
- **Réduire la dette documentaire** : tout nouveau contexte IA ou README pointe vers `docs/architecture/`.
- **Aligner Prisma** (`packages/db`) sur le SQL réel uniquement si cela apporte de la valeur (types partagés, CI) — sans remplacer les migrations Supabase comme autorité de déploiement.
- **Compléter** les flux sensibles : webhooks paiement, règles RLS manquantes, tests sur `computeAuthFlowDecision` et billing.

## Option scalable (moyen / long terme — hypothèses ouvertes)

Ces pistes ne sont **pas** des engagements de roadmap ; elles servent à cadrer des décisions futures :

| Thème | Piste | Condition de pertinence |
| --- | --- | --- |
| Hébergement / SSR | Framework avec SSR (ex. Next.js) si besoin SEO serveur, i18n critique SSR, ou intégrations BFF | Métriques LCP/SEO ou exigences réglementaires |
| ORM serveur | Prisma (ou autre) sur un **backend Node** séparé, si la logique dépasse ce que RLS + Edge Functions couvrent proprement | Complexité des transactions, intégrations tierces lourdes |
| Auth | **Un seul** fournisseur primaire en production : Supabase Auth | Décision produit / conformité |
| Paiements | Passerelle unifiée + webhooks signés + réconciliation automatique | Volume de transactions, réduction du travail manuel support |

## Dépendances critiques à documenter

- Projet Supabase (URL, clés anon, secrets fonctions).
- Fournisseurs paiement (Orange Money, MTN MoMo) et états métier associés.
- Aucune dépendance auth externe active côté runtime (Supabase Auth uniquement).

## Métriques de succès suggérées

- Taux d’erreur 4xx/5xx sur routes Supabase critiques (dashboard).
- Temps jusqu’à `useAuthFlow().isReady` (expérience post-login).
- Incidents liés au mauvais `fleet_id` / fuite de contexte tenant (idéalement zéro).

## Références

- État actuel : [CURRENT_ARCHITECTURE.md](./CURRENT_ARCHITECTURE.md)
- Multi-tenant : [MULTITENANT.md](./MULTITENANT.md)
- Backend Supabase PR #22 : [BACKEND_ARCHITECTURE_PR22.md](./BACKEND_ARCHITECTURE_PR22.md)
- Paiements : [PAYMENTS.md](./PAYMENTS.md)
