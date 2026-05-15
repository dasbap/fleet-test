# Flux d’authentification (canon dépôt)

Ce fichier résume **qui fournit la session** et **où la navigation est décidée**. Le détail pas à pas (ordre des redirections, équivalences snippets) reste dans **[docs/auth-flow.md](../auth-flow.md)** — à consulter en priorité pour les règles métier de routage post-login.

## Matrice des modes

| Mode | Condition typique | Implémentation |
| --- | --- | --- |
| **Mock** | `VITE_USE_MOCK_AUTH=true` | `MockAuthProvider` dans [src/contexts/AuthProvider.tsx](../../src/contexts/AuthProvider.tsx) — session locale, utile dev/démo ; garde vers `/login` selon configuration. |
| **Clerk** | `VITE_AUTH_PROVIDER=clerk` (et bundle Clerk chargé) | `ClerkAuthProvider` (lazy) ; `ClerkProvider` optionnel en tête d’app si `VITE_CLERK_PUBLISHABLE_KEY` est défini — [src/App.tsx](../../src/App.tsx). |
| **Supabase Auth** | Défaut (mock désactivé, provider ≠ `clerk`) | `SupabaseAuthProvider` : session Supabase, adhésions flotte, résolution `orgId` / flotte active. |

Un changement de mode mock peut être propagé via les événements documentés dans [src/lib/authMode.ts](../../src/lib/authMode.ts) (`AUTH_MODE_CHANGED_EVENT`).

## Parcours utilisateur (résumé)

1. Connexion : routes publiques `/auth` ou `/login` ([src/features/auth/routes.tsx](../../src/features/auth/routes.tsx)), avec garde invité `RequireGuest`.
2. Après connexion : redirection vers **`/post-login?next=...`**.
3. Agrégation d’état : **`useAuthFlow`** (adhésions, tenant, onboarding, facturation `useBilling`).
4. Décision pure : **`computeAuthFlowDecision`** dans [src/lib/auth-flow.ts](../../src/lib/auth-flow.ts).
5. Application de la navigation : **`PostLoginGate`** ([src/pages/PostLoginGate.tsx](../../src/pages/PostLoginGate.tsx)).
6. Accès aux pages protégées : **`ProtectedRoute`** ([src/components/layout/ProtectedRoute.tsx](../../src/components/layout/ProtectedRoute.tsx)) — auth, bootstrap tenant, onboarding, upgrade, rôles.

Ordre de priorité des redirections (non dupliqué ici) : voir section « Règles de redirection » dans [docs/auth-flow.md](../auth-flow.md).

## Fichiers d’ancrage

| Sujet | Fichier |
| --- | --- |
| Décision post-login | [src/lib/auth-flow.ts](../../src/lib/auth-flow.ts), tests [src/lib/auth-flow.test.ts](../../src/lib/auth-flow.test.ts) |
| Hook d’agrégation | [src/hooks/useAuthFlow.ts](../../src/hooks/useAuthFlow.ts) |
| Gate | [src/pages/PostLoginGate.tsx](../../src/pages/PostLoginGate.tsx) |
| Garde principale | [src/components/layout/ProtectedRoute.tsx](../../src/components/layout/ProtectedRoute.tsx) |
| Contexte session + flottes | [src/contexts/AuthProvider.tsx](../../src/contexts/AuthProvider.tsx) |
| Routes racine | [src/app/routes/app.routes.tsx](../../src/app/routes/app.routes.tsx) |

## Documentation détaillée

- **[docs/auth-flow.md](../auth-flow.md)** : vérité opérationnelle (tableaux, cohérence `/start` vs `/onboarding`, tests).
- Multi-tenant et contexte flotte : [MULTITENANT.md](./MULTITENANT.md).
