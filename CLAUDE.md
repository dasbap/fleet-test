# E-Samba — Contexte Projet (référence permanente)

## Identité produit
**E-Samba** est un SaaS B2B de gestion de flotte pour l'Afrique Centrale (zone CEMAC).
URL : https://e-samba.com | Cible : PME et transporteurs CM, TD, CF, CG, GA, GQ.

## Stack technique

### Web (SaaS dashboard)
| Couche | Technologie |
|---|---|
| Framework | Next.js 15 App Router |
| Langage | TypeScript strict |
| Style | Tailwind CSS + shadcn/ui |
| Base de données | PostgreSQL via Prisma ORM |
| Auth | Clerk |
| Déploiement | Vercel |
| Emails | Resend |

### Mobile (app native)
| Couche | Technologie |
|---|---|
| Framework | React Native (Expo) |
| Cache offline | MMKV |
| Auth biométrique | Face ID / empreinte |
| Push | FCM (Android) + APNs (iOS) |
| Deep links | Expo Router |
| Widgets OS | react-native-widgetkit |

## Domaines métier
- **Flotte** : véhicules, immatriculations, statuts, QR codes
- **DVIR** : contrôles journaliers pre/post-trip
- **Maintenance** : travaux, prédiction IA, historique
- **Transit CEMAC** : passages frontières, corridors, documents douaniers
- **Carburant** : plein, détection fraude
- **Alertes** : push FCM/APNs, gravité critique/haute/moyenne
- **Conducteurs** : profils, affectations, carnet perso
- **Facturation** : abonnements SaaS B2B, plusieurs modes de paiement

## Schéma de données (tables clés Prisma)
- `Fleet` → `Vehicle` → `Assignment` (conducteur actif)
- `FleetMembership` (is_active, role)
- `DvirInspection` → items JSON
- `MaintenanceJob` (statut, priorité)
- `TransitCemac` (corridor, document, statut)
- `FuelEntry` + `FraudScore`
- `Alert` (severity, resolved)
- `Subscription` + `Plan`

## Règles de code
- **Tout en français** : commentaires, noms de variables métier, messages UI
- Pas de `any` TypeScript
- RLS activé sur toutes les tables multi-tenant (isolé par `fleetId`)
- Migrations Prisma idempotentes
- Pas de commentaires évidents — seulement les WHY non-évidents
- Tests : Vitest (unit) + Playwright (e2e golden path)

## Architecture multi-tenant
Isolation par `fleetId` sur chaque requête. Clerk `orgId` = `fleetId` Prisma.
Middleware Next.js vérifie `auth().orgId` avant chaque route `/dashboard`.

## Commandes fréquentes
```bash
pnpm dev          # Next.js local
pnpm db:push      # prisma db push
pnpm db:studio    # Prisma Studio
pnpm test         # Vitest
pnpm test:e2e     # Playwright
```

## Roadmap (phases)
Voir `ROADMAP.md` — progression phase par phase, une confirmation requise entre chaque.
