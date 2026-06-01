# Audit performance, UX mobile et Web Vitals — E-Samba

**Date** : 2026-06-01  
**Périmètre** : SPA React (Vite) + Capacitor + Supabase  
**Baseline bundle** : ~322,7 Ko gzip initial (`/`, `/auth`) — cible 220 Ko ([`docs/todo-bundle-initial-optimization.md`](../todo-bundle-initial-optimization.md))

## Synthèse exécutive

| Priorité | Problème | Statut sprint |
|----------|----------|---------------|
| P0-1 | Bundle initial > cible Afrique | Sprint 1 (lazy Sentry, modulepreload) |
| P0-2 | Dashboard 6+ requêtes + polling 25–60 s | Sprint 2 (RPC `get_dashboard_snapshot`) |
| P0-3 | `useFuelLogs(200)` sur dashboard | Sprint 2 (agrégat SQL fuel) |
| P0-4 | Accueil natif = `Dashboard` desktop | Sprint 3 (`MobileHomeDashboard`) |
| P0-5 | `Drivers` / `Maintenance` tables desktop | Sprint 4 (`ResponsiveDataView`) |
| P1-1 | Sentry sync `App.tsx` | Sprint 1 |
| P1-4 | Pas de virtualisation listes | Sprint 5 |
| P2-1 | Pas de pull-to-refresh | Sprint 3 |
| P2-2 | LHCI limité aux routes publiques | Sprint 8 — `lighthouserc.dashboard.json` |

## Livrables ajoutés (implémentation)

- RPC `get_dashboard_snapshot` + `useDashboardSnapshot`
- `LazySentryErrorBoundary`, `modulePreload` filtré (charts/maps/analytics)
- Budget gzip palier **280 Ko** (`check-critical-route-budgets.mjs`)
- Accueil natif `MobileHomeDashboard`, `PullToRefresh`
- `ResponsiveDataView`, listes mobile conducteurs/maintenance
- `design-system/tokens/*`, composants `Esamba*`, `VirtualList`
- `GeofenceRepository` / `GeofenceService`
- Scripts : `audit:routes`, `check:design-tokens`, `check:no-supabase-ui`
- QA : `docs/qa/checklist-responsive-perf.md`, `checklist-production-mobile.md`
- Inventaire : `docs/audits/route-inventory.json` (44 routes)

## Inventaire routes dashboard

Généré via `node scripts/generate-route-inventory.mjs` → [`route-inventory.json`](./route-inventory.json).

Routes principales (P0 Lighthouse) :

- `/dashboard` — accueil
- `/dashboard/vehicles`, `/dashboard/vehicles/:id`
- `/dashboard/drivers`, `/dashboard/maintenance`, `/dashboard/fuel`
- `/dashboard/billing`, `/dashboard/alerts`, `/dashboard/tutorials`

## Architecture données (avant / après)

**Avant** : `useActionableDashboard` → 6 hooks React Query (KPIs, stats, véhicules, fuel×200, maintenance, alertes effet).

**Après** : `useDashboardSnapshot` → 1 RPC + alertes realtime + maintenance planifiée (optionnel).

## Métriques cibles

| Métrique | Baseline | Cible |
|----------|----------|-------|
| JS gzip `/` | ~323 Ko | ≤ 280 Ko (palier), puis 220 Ko |
| Requêtes REST `/dashboard` (1er paint) | 6+ | ≤ 3 |
| Lighthouse perf dashboard | non mesuré | ≥ 0,90 (profil dédié) |
| CLS | ≤ 0,05 (CI) | maintenir |

## Références

- [`vite.config.ts`](../../vite.config.ts) — manualChunks, PWA, Workbox 3G
- [`src/components/Providers.tsx`](../../src/components/Providers.tsx) — offlineFirst, staleTime 5 min
- [`.github/lighthouse/`](../../.github/lighthouse/) — profils CI
