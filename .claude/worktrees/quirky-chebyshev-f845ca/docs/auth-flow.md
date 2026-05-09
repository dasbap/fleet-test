# Flux d’authentification (réel) — Smart Fleet / E‑Samba

Ce document décrit le **flux réellement implémenté** dans le dépôt (post‑login gating), et clarifie les écarts avec d’anciens snippets basés sur un RPC `get_auth_context`.

## Résumé

- **Connexion** : `/auth` (ou `/login` en mode mobile / mock)
- **Point d’entrée post‑connexion** : `/post-login?next=...`
- **Décision de redirection** : `useAuthFlow()` + `computeAuthFlowDecision()`
- **Navigation** : `PostLoginGate` redirige vers la route calculée

## Arbre des composants / modules

- **UI login** : [`src/features/auth/screens/AuthPage.tsx`](../src/features/auth/screens/AuthPage.tsx)
  - Après `signIn`, redirige vers `/post-login?next=...`.
- **Gate** : [`src/pages/PostLoginGate.tsx`](../src/pages/PostLoginGate.tsx)
  - Attend que `useAuthFlow().isReady` soit vrai, puis `navigate(decision.path)`.
- **Hook d’agrégation** : [`src/hooks/useAuthFlow.ts`](../src/hooks/useAuthFlow.ts)
  - Agrège : session (`useAuth`), adhésions, `orgId/fleetId`, onboarding (`RouteAccessRepository`), facturation (`useBilling` + `FleetBillingService`).
- **Règles de décision (pur)** : [`src/lib/auth-flow.ts`](../src/lib/auth-flow.ts)
  - `detectFirstLogin()` et `computeAuthFlowDecision()`.
- **Auth applicative (session + memberships)** : [`src/contexts/AuthProvider.tsx`](../src/contexts/AuthProvider.tsx)

## Règles de redirection (ordre de priorité)

Implémentées dans `computeAuthFlowDecision` :

1. **Non authentifié** → `/auth`
2. **Authentifié sans adhésion** → `/start`
3. **Première connexion ou onboarding incomplet** → `/onboarding`
4. **Abonnement payant expiré** (`lapsedPaid`) → `/upgrade`
5. **Rôle conducteur** → `/terrain`
6. **Rôle mécanicien** → `/maintenance`
7. **Sinon** → `next` validé (anti open‑redirect), ou `/dashboard`

## Notes importantes

- Les chemins `/terrain`, `/maintenance`, `/upgrade` existent côté routes racine mais sont **des redirections** vers des pages dashboard (voir [`src/app/routes/app.routes.tsx`](../src/app/routes/app.routes.tsx)). Cela conserve des URLs “courtes” pour mobile tout en concentrant l’UI dans le dashboard.
- `useAuthFlow` a un **timeout** (`AUTH_FLOW_MAX_WAIT_MS`) pour éviter un écran bloqué en réseau dégradé.

## Tests

- Tests de la logique pure : [`src/lib/auth-flow.test.ts`](../src/lib/auth-flow.test.ts)
- Smoke test de redirection gate : [`src/pages/PostLoginGate.test.tsx`](../src/pages/PostLoginGate.test.tsx)

