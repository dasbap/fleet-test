# E-Samba — Contexte Projet (référence permanente)

> **Ce dépôt (smart-fleet-africa)** : la stack et l’architecture **réellement implémentées** sont décrites dans [docs/architecture/CURRENT_ARCHITECTURE.md](docs/architecture/CURRENT_ARCHITECTURE.md) (vérité unique). Le tableau « Web » ci-dessous reflète **ce dépôt** ; les sections « vision produit » restent utiles pour le vocabulaire métier commun.

## Identité produit
**E-Samba** est un SaaS B2B de gestion de flotte pour l'Afrique Centrale (zone CEMAC).
URL : https://e-samba.com | Cible : PME et transporteurs CM, TD, CF, CG, GA, GQ.

## Stack technique

### Web (SaaS dashboard — ce dépôt)
| Couche | Technologie |
|---|---|
| Build | Vite |
| Framework UI | React |
| Routage | React Router v6 (`BrowserRouter`, drapeaux futurs v7) — arborescence des routes et layouts dans **`src/app/`** (`routes/app.routes.tsx`, `routes/dashboard.routes.tsx`, `RootLayout.tsx`) |
| Langage | TypeScript strict |
| Style | Tailwind CSS + shadcn/ui |
| Données | PostgreSQL via **Supabase** (client JS, RLS) |
| Auth | **Supabase Auth** par défaut ; **Clerk** optionnel (`VITE_AUTH_PROVIDER=clerk`) ; mock dev (`VITE_USE_MOCK_AUTH`) |
| ORM / schéma | Migrations **Supabase** (`supabase/migrations/`) = source de vérité runtime ; **Prisma** dans `packages/db` (génération / tooling, pas le runtime navigateur) |
| Déploiement | **Vercel** (SPA : `vercel.json`, build `dist`, rewrites) — pas de Next.js App Router dans ce dépôt |
| Webhook Clerk → Supabase | Handler [`api/webhooks/clerk.ts`](api/webhooks/clerk.ts) (URL prod documentée dans le fichier) ; **une seule** URL doit être enregistrée dans Clerk (voir [docs/deployment-e-samba-vercel.md](docs/deployment-e-samba-vercel.md) §6) |
| Emails / automatisations | Edge Functions et secrets côté Supabase (voir doc setup) |

### Mobile (app native)
| Couche | Technologie |
|---|---|
| Shell web embarqué | **Capacitor** (scripts `build:capacitor`, `mobile:prepare`, stores) |
| App Expo (monorepo) | **React Native (Expo)** sous `apps/mobile` (scripts `mobile:expo:*`) |
| Cache offline | MMKV (vision Expo) ; quotas tutoriels côté web (`VITE_TUTORIAL_OFFLINE_QUOTA_MB`) |
| Auth biométrique | Face ID / empreinte (vision native) |
| Push | FCM (Android) + APNs (iOS) ; `@capacitor/push-notifications` côté natif |
| Deep links | Expo Router + deep links web (voir `docs/deep-links-esamba.md`) |

## Domaines métier
- **Flotte** : véhicules, immatriculations, statuts, QR codes
- **DVIR** : contrôles journaliers pre/post-trip
- **Maintenance** : travaux, prédiction IA, historique
- **Transit CEMAC** : passages frontières, corridors, documents douaniers
- **Carburant** : plein, détection fraude
- **Alertes** : push FCM/APNs, gravité critique/haute/moyenne
- **Conducteurs** : profils, affectations, carnet perso
- **Facturation** : abonnements SaaS B2B, plusieurs modes de paiement

## Schéma de données

### Ce dépôt (tables PostgreSQL / Supabase)
Entités typiques : `organisations`, `flottes` (`org_id`), `flotte_adhesions`, `vehicules`, `abonnements`, `plans`, `paiements`, etc. Voir migrations et [docs/architecture/MULTITENANT.md](docs/architecture/MULTITENANT.md), [docs/architecture/PAYMENTS.md](docs/architecture/PAYMENTS.md).

### Vocabulaire produit (alignement Prisma `packages/db`)
Le package `packages/db` expose des noms de modèles proches de : `Fleet` → `Vehicle` → `Assignment`, `FleetMembership`, `MaintenanceJob`, `Subscription` + `Plan`, etc. — utile pour types / génération ; **l’alignement SQL déployé** reste celui des migrations Supabase.

## Règles de code
- **Tout en français** : commentaires, noms de variables métier, messages UI
- Pas de `any` TypeScript
- **RLS** activé sur les tables multi-tenant (isolation par `fleet_id` / adhésions + `auth.uid()`)
- Migrations **Supabase** versionnées et idempotentes dans la mesure du possible
- Pas de commentaires évidents — seulement les WHY non-évidents
- Tests : Vitest (unit) + Playwright (e2e golden path)

## Architecture multi-tenant
Isolation par **flotte** (`fleet_id`) et **organisation** (`org_id` sur `flottes` / facturation). Côté client : contexte actif et garde de routes (voir [docs/architecture/MULTITENANT.md](docs/architecture/MULTITENANT.md), [docs/auth-flow.md](docs/auth-flow.md)). **Pas** de middleware Next.js dans ce dépôt : les gardes sont React (`ProtectedRoute`, `useAuthFlow`).

## Commandes fréquentes (ce dépôt)
```bash
npm run dev              # Vite local
npm run build            # prisma generate + vite build
npm run lint && npm test # qualité
# Supabase : voir docs/SUPABASE-SETUP.md et scripts npm check:supabase / verify:supabase
```

## Roadmap (phases)
Voir `ROADMAP.md` — progression phase par phase, une confirmation requise entre chaque.
