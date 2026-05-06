# E-Samba — Roadmap Stratégique

> Règle d'exécution : chaque phase attend une confirmation explicite avant démarrage.
> Objectif : architecture solide, zéro token gaspillé sur du code à refaire.

---

## Phase 1 — Architecture & Fondations
**Durée estimée : 1 session**
**Confirmation requise : OUI avant démarrage**

### 1.1 Initialisation projet Next.js
- `npx create-next-app@latest e-samba --typescript --tailwind --app --src-dir`
- Configuration ESLint + Prettier + path aliases (`@/`)
- `pnpm add prisma @prisma/client clerk next-clerk shadcn/ui`

### 1.2 Structure de dossiers
```
src/
  app/
    (auth)/          # Routes publiques Clerk
    (dashboard)/     # Routes protégées, layout avec sidebar
    api/             # Route handlers
  components/
    ui/              # shadcn/ui (Button, Card, Badge…)
    fleet/           # Composants métier flotte
    dvir/
    maintenance/
    transit/
  lib/
    prisma.ts        # Singleton PrismaClient
    auth.ts          # Helpers Clerk
    utils.ts
  hooks/             # useFetch, useFleet, etc.
  types/             # Types TypeScript partagés
prisma/
  schema.prisma      # Schéma complet
  migrations/
```

### 1.3 Schéma Prisma complet
Toutes les tables : Fleet, Vehicle, FleetMembership, Profile,
DvirInspection, MaintenanceJob, TransitCemac, FuelEntry,
Alert, Subscription, Plan, OrgInvitation.

### 1.4 Middleware Clerk + multi-tenant
- `middleware.ts` : protection `/dashboard/**`, injection `orgId`
- Helper `requireFleetAccess(fleetId)` — utilisé dans chaque Server Action

### 1.5 Layout dashboard
- Sidebar responsive (mobile drawer)
- Header avec sélecteur de flotte (Clerk org switcher)
- Thème Tailwind couleurs E-Samba (vert Cameroun #007A3D, orange #FF6B35)

**Livrable Phase 1 :** projet qui démarre, authentification Clerk fonctionnelle,
Prisma connecté, dashboard vide mais navigable.

---

## Phase 2 — Développement des Fonctionnalités Clés
**Durée estimée : 3–4 sessions**
**Confirmation requise : OUI avant démarrage**

### 2.1 Module Véhicules
- Liste paginée avec filtres (statut, alerte, maintenance)
- Fiche véhicule : détails, QR code (génération PNG), historique
- CRUD complet via Server Actions Prisma

### 2.2 Module DVIR
- Formulaire contrôle journalier (pre/post-trip, weekly)
- Items JSON configurable par flotte
- Statut `ok / minor_issues / unsafe` avec blocage opérationnel
- Historique par véhicule

### 2.3 Module Maintenance
- Tableau kanban : En attente → En cours → Terminé
- Prédiction IA : scoring de risque par véhicule (règles + ML léger)
- Notifications alertes critique/haute

### 2.4 Module Transit CEMAC
- Création transit (corridor, document douanier, dates)
- Suivi statut (en_route → arrivé / incident)
- Carte corridors (optionnel : Mapbox GL)

### 2.5 Module Conducteurs
- Profils, affectations véhicule
- Carnet personnel (notes, documents)
- Score comportemental (consommation, DVIR)

### 2.6 Facturation SaaS B2B
- Plans : Starter / Pro / Enterprise
- Paiement : Stripe (CB) + Mobile Money (Orange, MTN) via Flutterwave
- Portail client Clerk (gestion abonnement)

### 2.7 App Mobile React Native (Expo)
- Auth Clerk mobile
- QR scan véhicule → fiche
- Mode offline MMKV (sync différée)
- Push notifications FCM/APNs
- Face ID / biométrie
- Widgets écran d'accueil
- Deep links vers fiches

**Livrable Phase 2 :** toutes les fonctionnalités métier utilisables en staging.

---

## Phase 3 — Tests & Sécurité
**Durée estimée : 1–2 sessions**
**Confirmation requise : OUI avant démarrage**

### 3.1 Tests unitaires (Vitest)
- Logique métier : scoring maintenance, détection fraude carburant
- Helpers auth : `requireFleetAccess`, isolation multi-tenant
- Repositories : mock Prisma, cas limites

### 3.2 Tests E2E (Playwright)
- Golden paths : login → créer flotte → ajouter véhicule → DVIR → maintenance
- Test isolation multi-tenant (flotte A ne voit pas flotte B)
- Test paiement sandbox Stripe

### 3.3 Audit sécurité
- Vérifier que chaque Server Action valide `orgId` avant requête Prisma
- Rate limiting (Upstash Redis) sur les API publiques
- Headers sécurité Next.js (`Content-Security-Policy`, etc.)
- Revue des variables d'environnement (pas de secrets en clair)

### 3.4 Performance
- Lazy loading routes lourdes
- Images optimisées `next/image`
- Bundle analyzer — cible < 200 KB JS initial
- Cache Prisma sur les requêtes fréquentes (unstable_cache)

**Livrable Phase 3 :** couverture tests > 80% logique métier, 0 faille critique.

---

## Phase 4 — Déploiement & Finalisation Terrain
**Durée estimée : 1 session**
**Confirmation requise : OUI avant démarrage**

### 4.1 Infrastructure Vercel
- Variables d'environnement production Vercel
- Domain e-samba.com + SSL
- Preview deployments sur chaque PR
- Analytics Vercel (Core Web Vitals)

### 4.2 Base de données production
- PostgreSQL Neon (serverless, free tier généreux) ou Supabase
- Migrations Prisma appliquées en CI/CD
- Backups automatiques quotidiens

### 4.3 CI/CD GitHub Actions
- `pnpm lint + typecheck + test` sur chaque PR
- `prisma migrate deploy` en production après merge main
- Lighthouse CI (score > 90)

### 4.4 Monitoring & Observabilité
- Sentry (erreurs JS + API)
- Logtail / Axiom (logs Next.js)
- Uptime robot (alertes si down)

### 4.5 Onboarding terrain
- Tutoriels vidéo intégrés (Loom embed)
- Onboarding wizard : créer flotte → ajouter véhicule → inviter conducteur
- Support multilingue : FR, EN, AR (i18next)
- Documentation utilisateur (Notion public ou Mintlify)

### 4.6 App stores
- Soumission iOS App Store + Android Google Play
- ASO (screenshots, descriptions FR/EN)
- Deep links universels configurés

**Livrable Phase 4 :** e-samba.com en production, app stores soumises,
premiers clients onboardés.

---

## Résumé des livrables par phase

| Phase | Livrable | Go/No-go |
|---|---|---|
| 1 — Fondations | Projet démarré, auth, Prisma, layout | ✅ Confirmation |
| 2 — Features | Tous modules métier en staging | ✅ Confirmation |
| 3 — Tests | Couverture > 80%, audit sécu OK | ✅ Confirmation |
| 4 — Deploy | Production live, app stores | ✅ Confirmation |

---

## Règles d'efficacité token

1. **CLAUDE.md lu en début de session** — pas de répétition du contexte
2. **Plan d'abord** (`/plan`) — validation avant code
3. **Fichiers ciblés** — jamais de lecture de tout le dossier
4. **Une feature = une branche = une PR** — diff minimal
5. **Server Actions** — pas de route handler quand une SA suffit
