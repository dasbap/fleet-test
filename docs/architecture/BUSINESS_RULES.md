# Règles métier partagées — Web + Capacitor (Android / iOS)

Ce document est la **référence unique** pour les règles métier côté client lorsque le même code s’exécute sur le web (Vercel) et dans l’app native Capacitor (WebView de `dist/`). L’app Expo sous `apps/mobile` est hors périmètre produit Flotte.

Architecture : [CURRENT_ARCHITECTURE.md](./CURRENT_ARCHITECTURE.md) — validation centralisée dans `src/domain/`.

## Où vit chaque règle

| Couche | Rôle |
| --- | --- |
| `src/domain/constants/` | Enums et libellés FR (modes collecte, catégories incident, statuts véhicule, tutoriels) |
| `src/domain/schemas/` | Schémas Zod — **source de vérité** pour services et formulaires |
| `src/services/` | `parseSchemaOrThrow` + règles non déclaratives (ex. km fin ≥ km départ) |
| `src/repositories/` | Accès Supabase uniquement |
| `src/hooks/` | React Query — **pas** d’appel `supabase.from` / `rpc` direct |

## Domaines migrés

### Incidents

| Règle | Valeur |
| --- | --- |
| Schéma service | `incidentCreateSchema` — [`src/domain/schemas/incident.schema.ts`](../../src/domain/schemas/incident.schema.ts) |
| Schéma formulaire | `incidentDeclarationFormSchema` (même fichier) |
| Description | 10–4000 caractères (trim côté service) |
| Sévérité | `low` \| `medium` \| `high` \| `critical` |
| Catégories | `INCIDENT_CATEGORY_VALUES` — [`src/domain/constants/incidentCategories.ts`](../../src/domain/constants/incidentCategories.ts) |
| Géolocalisation | Latitude et longitude fournies ensemble ; bornes WGS84 |
| Service | [`incident.service.ts`](../../src/services/incident.service.ts) |
| Écrans | Déclaration incident conducteur, file offline `incident:create` |

### Véhicules

| Règle | Valeur |
| --- | --- |
| Schéma formulaire | `vehicleCreateFormSchema` |
| Schéma insert | `vehicleInsertSchema` — immatriculation requise, normalisation `trim().toUpperCase()` dans le service |
| Année formulaire | 1990 … année courante + 1 |
| Statuts | `ok` \| `blocked` — [`vehicleStatus.ts`](../../src/domain/constants/vehicleStatus.ts) |
| Service | [`vehicle.service.ts`](../../src/services/vehicle.service.ts) |

### Créneaux conducteur

| Règle | Valeur |
| --- | --- |
| Mode collecte | `cash` \| `momo` \| `mix` — [`collectionMode.ts`](../../src/domain/constants/collectionMode.ts) |
| Schéma clôture service | `shiftClosureInsertSchema` |
| Schéma formulaire | `shiftClosureFormSchema` |
| Preuve clôture | `proof_type` et `proof_value` requis |
| Km fin | ≥ km départ (contrôle service après parse Zod) |
| Service | [`driver-shift.service.ts`](../../src/services/driver-shift.service.ts) |
| Jobs offline | `shift:start`, `shift:close` — types dans [`offline-queue.ts`](../../src/types/offline-queue.ts) |

### Tutoriels (Guides)

| Règle | Valeur |
| --- | --- |
| Complétion vidéo | **80 %** de la durée — `TUTORIAL_COMPLETION_RATIO` = `0.8` |
| Catalogue seed | [`catalog.seed.ts`](../../src/data/tutorials/catalog.seed.ts) — source DB + fallback hors ligne |
| Vignettes Storage | Seed canonique `thumbs/{slug}.svg` ; à l’affichage [`thumbPathCandidates`](../../src/features/tutorials/lib/tutorialStorageAssets.ts) tente svg puis **jpg** (assets legacy / QA mobile) |
| Progression | Compte connecté → Supabase ; hors ligne → file sync web |
| QA manuelle | [mobile-qa-checklist.md](../mobile-qa-checklist.md) § Tutoriels |

## Sécurité et RLS

Les schémas client **ne remplacent pas** la RLS PostgreSQL. Toute règle critique (isolation `fleet_id`, quotas plan) doit rester enforce côté Supabase ; le client affiche des messages FR via `parseSchemaOrThrow` et les services.

## Hooks migrés (plus d’appel Supabase direct)

- [`useFleetMetrics`](../../src/hooks/dashboard/useFleetMetrics.ts) → `DashboardService`
- [`useSessionContext`](../../src/hooks/useSessionContext.ts) → `SessionContextService` (auth `getSession` / `onAuthStateChange` reste dans le hook)
- [`useScheduledReports`](../../src/hooks/useScheduledReports.ts) → `ScheduledReportService`

## Évolutions

- Nouvelle règle métier : ajouter constante + schéma Zod dans `src/domain/`, puis service, puis formulaire.
- Ne pas dupliquer les enums dans les composants.
- Voir [TARGET_ARCHITECTURE.md](./TARGET_ARCHITECTURE.md) pour l’évolution BFF / Edge.

## Références

- [ARCHITECTURE.md](../ARCHITECTURE.md)
- [MULTITENANT.md](./MULTITENANT.md)
- [offline-test-matrix-web-mobile.md](../offline-test-matrix-web-mobile.md)
