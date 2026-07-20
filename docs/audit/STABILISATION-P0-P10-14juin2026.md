# Stabilisation E-Samba — Bilan P0 à P10 (14 juin 2026)

> Complète l'audit initial du [12 juin 2026](./AUDIT-ESAMBA-12juin2026.md).  
> Référence architecture : [CURRENT_ARCHITECTURE.md](../architecture/CURRENT_ARCHITECTURE.md).

## Synthèse exécutive

Campagne de stabilisation en 10 phases (P0–P10) sur le dépôt **smart-fleet-africa** (E-Samba web). Objectifs : navigation centralisée, API BFF Vercel, résilience UI, alignement strict **Hooks → Services → Repositories**.

| Domaine | Avant | Après P10 |
|---------|-------|-----------|
| Navigation | URLs dispersées | `routePaths.ts` + `navigation.ts` (source unique) |
| API edge | Partielle | `/api/health`, `/api/auth/me`, billing, demo |
| Architecture hooks | ~15 hooks Supabase direct | **0 hook métier** avec Supabase direct |
| Stabilité dashboard | Crash global | `SectionErrorBoundary` par section |
| Tests ciblés | Fragmentés | Suite P7–P10 (~20 tests unitaires) |

## Phases livrées

| Phase | Contenu | Statut |
|-------|---------|--------|
| **P0** | Redirects legacy, HelpProvider, nav centralisée | ✅ prod |
| **P1** | Navbar mobile, ancres, CTAs | ✅ prod |
| **P2** | Redirects legacy, searchIndex, code-splitting | ✅ prod |
| **P3–P5** | Routes dashboard, lazy PostHog, admin demo BFF | ✅ prod |
| **P6** | Emails centralisés (`CONTACT`, `SUPPORT`, `PRIVACY`) | ✅ prod (`b6c25be`) |
| **P7** | Fix duplicate key build, payment-history, DVIR upload | ✅ local |
| **P8** | demo-session, prospect-demo, dashcam, session context | ✅ local |
| **P9** | access-code, driver-terrain, voice-coaching, admin-profile | ✅ local |
| **P10** | useRealtimeWorker, useTopDriverScores, useSessionContext | ✅ local |

## P10 — Finition architecture hooks

### Migrations effectuées

| Hook | Avant | Après |
|------|-------|-------|
| `useRealtimeWorker` | `supabase.auth.getSession` + `onAuthStateChange` | `useAuth().session.access_token` |
| `useTopDriverScores` | RPC direct | `DriverScoreService.getTopDriverScores` |
| `useSessionContext` | `onAuthStateChange` + RPC via service | `useAuth().session` + effet sur `fetchContext` |

### Hooks sans Supabase direct (état final)

Tous les hooks sous `src/hooks/` respectent la couche service, **sauf** les composants auth natifs (`AuthProvider`, `AuthCallbackPage`, `useDeviceSessions`) qui restent légitimement couplés à Supabase Auth.

## API Vercel (`api/`)

| Route | Méthode | Rôle |
|-------|---------|------|
| `/api/health` | GET | Sonde `{ status, ts }` |
| `/api/auth/me` | GET | Profil JWT + adhésions |
| `/api/billing/context` | GET/POST | Contexte facturation flotte |
| `/api/demo/create-access` | POST | Création accès démo (admin) |

Lib partagée : `api/_lib/vercel-api.ts`.

## Résilience UI

- **`SectionErrorBoundary`** autour de `<Outlet />` dans `DashboardLayout`
- Messages utilisateur sans stack trace
- Fallback avec bouton « Réessayer »

## Validation (14 juin 2026)

| Check | Résultat |
|-------|----------|
| Tests P7–P10 | ✅ ~20 tests unitaires |
| `tsc --noEmit` | ✅ |
| `npm run build` | ✅ (post-P7, sans warning duplicate key) |
| Route dupliquée `drivers/scores` | ✅ absente (une seule entrée) |
| `CreateInvitationDialog` | ✅ via `useCreateInvitation` |

## Dette résiduelle (hors scope P10)

| Item | Priorité | Note |
|------|----------|------|
| ESLint warnings a11y (labels, autoFocus) | Basse | Préexistant, non bloquant build |
| `npm run preview` / Capacitor Android | Moyenne | Build prod OK, validation manuelle à planifier |
| Mission responsive 360px | Moyenne | Non validée en P10 |
| `useDeviceSessions` Supabase direct | Basse | Auth device, acceptable |
| `AuthProvider` Supabase direct | N/A | Source de vérité auth |

## Recommandations post-P10

1. **Commit unique P7–P10** puis déploiement Vercel prod
2. Smoke test : `/api/health`, login, dashboard véhicules, scores conducteurs
3. Valider preview mobile (`npm run preview`) avant release Capacitor
4. Traiter les warnings a11y par lot (pages Pricing, HelpCenter)

## Commandes de validation

```bash
npm test -- --run src/test/access-code.service.test.ts src/test/dashcam.service.test.ts
npm test -- --run src/hooks/useRealtimeWorker.test.ts src/hooks/useSessionContext.test.tsx
npx tsc --noEmit
npm run build
```

---

*Document généré dans le cadre de la campagne de stabilisation E-Samba — juin 2026.*
