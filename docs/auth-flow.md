# Flux d’authentification (réel) — Smart Fleet / E‑Samba

Ce document décrit le **flux réellement implémenté** dans le dépôt (post-login gating), et clarifie l’équivalence avec les snippets de routing "complet" souvent partagés pour E-Samba.

## Résumé

- **Connexion** : `/auth` (ou `/login` en mode mobile / mock)
- **Point d’entrée post‑connexion** : `/post-login?next=...`
- **Décision de redirection** : `useAuthFlow()` + `computeAuthFlowDecision()`
- **Navigation** : `PostLoginGate` redirige vers la route calculée

## Cartographie snippet -> implémentation réelle

| Élément attendu dans un snippet | Implémentation dans ce dépôt |
| --- | --- |
| `AuthFlowProvider` injecté dans un layout racine | [`src/app/RootLayout.tsx`](../src/app/RootLayout.tsx) monte `AuthFlowProvider` autour de `Outlet`. |
| Route publique auth avec redirection si déjà connecté | [`RequireGuest`](../src/navigation/guards/RequireGuest.tsx) via [`src/features/auth/routes.tsx`](../src/features/auth/routes.tsx). |
| Garde principale (`ProtectedRoute`) | [`src/components/layout/ProtectedRoute.tsx`](../src/components/layout/ProtectedRoute.tsx) gère auth, tenant bootstrap, onboarding, upgrade et filtre de rôles optionnel. |
| Décision post-login centralisée | [`src/lib/auth-flow.ts`](../src/lib/auth-flow.ts) + [`src/hooks/useAuthFlow.ts`](../src/hooks/useAuthFlow.ts), exécutée par [`src/pages/PostLoginGate.tsx`](../src/pages/PostLoginGate.tsx). |
| Raccourcis `/terrain`, `/maintenance`, `/upgrade` | Définis dans [`src/app/routes/app.routes.tsx`](../src/app/routes/app.routes.tsx), avec redirection vers les écrans canoniques dashboard selon le cas. |

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

- Les chemins `/terrain`, `/maintenance`, `/upgrade` existent côté routes racine ; ce sont des **raccourcis d’entrée** qui pointent ensuite vers les écrans dashboard canoniques (voir [`src/app/routes/app.routes.tsx`](../src/app/routes/app.routes.tsx)).
- `useAuthFlow` a un **timeout** (`AUTH_FLOW_MAX_WAIT_MS`) pour éviter un écran bloqué en réseau dégradé.

## Cohérence onboarding: `/start` vs `/onboarding`

Ordre attendu des transitions pour éviter les ambiguïtés:

1. **Pas d’adhésion active** (`memberships.length === 0`) -> `/start`
2. **Adhésion active + onboarding requis** (première connexion ou onboarding incomplet, rôles `organizer`/`manager`) -> `/onboarding`
3. **Route `/onboarding` sans `orgId` résolu** -> fallback `/start` (sécurité de contexte)

Ce comportement est cohérent entre:

- `computeAuthFlowDecision` (règle métier pure)
- `useRouteAccess` (état de garde des routes)
- `ProtectedRoute` et `OnboardingRoute` (couche présentation/navigation)

## Mobile Capacitor (Supabase Auth)

Sous l’app native, [`getAuthRedirectUrl`](../src/features/auth/utils/authRedirects.ts) utilise par défaut le schéma **`esamba://`** (ex. `esamba://auth/callback`, `esamba://auth/update-password`). [`DeepLinkListener`](../src/components/navigation/DeepLinkListener.tsx) et [`resolveAppUrl`](../src/lib/deepLinks/resolveAppUrl.ts) transforment ces URLs en routes SPA (`/auth/callback`, etc.).

**Supabase Dashboard → Authentication → URL Configuration**

- Site URL : `https://www.e-samba.com`
- Redirect URLs (ajouter selon le flux) :
  - `esamba://auth/callback`
  - `esamba://auth/update-password`
  - `https://www.e-samba.com/auth/callback`
  - `https://www.e-samba.com/auth/callback/**`
  - `https://www.e-samba.com/auth/update-password`
  - `https://www.e-samba.com/auth/update-password/**`

**Build mobile** (`.env.local` avant `npm run build:capacitor`) :

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (obligatoires)
- `VITE_APP_URL=https://www.e-samba.com` recommandé si vous préférez les liens email en HTTPS (App Links)
- `VITE_AUTH_MOBILE_USE_WEB_REDIRECTS=true` pour forcer les redirects HTTPS même dans l’app native

Checklist complète : [mobile-qa-checklist.md](./mobile-qa-checklist.md).

**Application automatique** (empreintes Android + push Supabase) : `npm run supabase:push-auth-config` (voir `scripts/apply-mobile-store-setup.mjs`). Définir `APPLE_TEAM_ID` dans `.env.local` pour mettre à jour `apple-app-site-association`.

## Tests

- Tests de la logique pure : [`src/lib/auth-flow.test.ts`](../src/lib/auth-flow.test.ts)
- Smoke test de redirection gate : [`src/pages/PostLoginGate.test.tsx`](../src/pages/PostLoginGate.test.tsx)
- Deep links / App Links : [`src/test/resolveAppUrl.test.ts`](../src/test/resolveAppUrl.test.ts)

