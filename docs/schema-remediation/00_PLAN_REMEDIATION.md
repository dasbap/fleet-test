# E-Samba — Plan de remédiation schéma

> Généré le 2026-05-21 · Basé sur l'audit réel du projet `zqxjvmejoktwlcqshnwi`

---

## 1. Problèmes identifiés (audit réel)

| # | Problème | Gravité | Table/Objet |
|---|----------|---------|-------------|
| 1 | Colonne `data` (nullable) + `steps_data` coexistent | CRITIQUE | `onboarding_progress` |
| 2 | `profils.universe` (enum) ET `profils.access_universe` (text) dupliqués | MOYEN | `profils` |
| 3 | `flotte_adhesions` manque `statut`, `rejoint_le`, `updated_at` | MOYEN | `flotte_adhesions` |
| 4 | 15 vues `SECURITY DEFINER` → bypass RLS | CRITIQUE | vues publiques |
| 5 | RPC `sauvegarder_progression_onboarding` absente → fallback REST 400 | CRITIQUE | onboarding |
| 6 | `onboarding_progress.step` default = 0 (devrait être 1) | FAIBLE | `onboarding_progress` |
| 7 | `profils` : pas de `updated_at` automatique via trigger | MOYEN | triggers |
| 8 | Pas de trigger de création automatique de profil post-signup | CRITIQUE | auth |
| 9 | Migrations SQL manuelles hors versionning | CRITIQUE | gouvernance |
| 10 | `scores_conducteurs.score_total` nullable sans default | FAIBLE | `scores_conducteurs` |

---

## 2. Structure de dossier recommandée

```
supabase/
  migrations/
    YYYYMMDDHHMMSS_description_courte.sql   ← format obligatoire
  migrations/remediation/                   ← migrations correctives groupées
    00_audit_schema.sql
    01_baseline_canonical_schema.sql
    02_safe_alter_existing_tables.sql
    03_constraints_indexes.sql
    04_rls_policies.sql
    05_rpc_functions.sql
    06_triggers.sql
    07_seed_internal_accounts.sql
    08_cleanup_unused.sql
    09_validation_tests.sql
  seed/
    demo_accounts.sql
    internal_accounts.sql
scripts/
  audit_drift.sql                           ← à exécuter avant chaque release
  validate_production.sql
docs/
  schema-remediation/
    00_PLAN_REMEDIATION.md  ← ce fichier
    SCHEMA_CANONIQUE.md
    GOUVERNANCE.md
```

---

## 3. Ordre d'exécution des migrations correctives

```
1. 00_audit_schema.sql          → lecture seule, pas de risque
2. 02_safe_alter_existing_tables.sql  → ALTER TABLE idempotents
3. 03_constraints_indexes.sql   → ADD CONSTRAINT IF NOT EXISTS
4. 06_triggers.sql              → CREATE OR REPLACE
5. 04_rls_policies.sql          → DROP + CREATE idempotents
6. 05_rpc_functions.sql         → CREATE OR REPLACE
7. 07_seed_internal_accounts.sql → INSERT ... ON CONFLICT DO NOTHING
8. 09_validation_tests.sql      → assertions DO $$ ... $$
9. 08_cleanup_unused.sql        → APRÈS validation uniquement
```

⚠️ **Ne jamais exécuter `08_cleanup_unused.sql` sans avoir validé `09_validation_tests.sql` d'abord.**

---

## 4. Règles de gouvernance SQL (obligatoires)

### Avant toute modification de schéma
- [ ] Backup snapshot (Supabase Dashboard → Database → Backups)
- [ ] Créer une migration versionnée : `YYYYMMDDHHMMSS_description.sql`
- [ ] Migration idempotente : `CREATE ... IF NOT EXISTS`, `DO $$ IF NOT EXISTS ... $$`
- [ ] Tester sur staging (branch Supabase) avant production
- [ ] Obtenir review d'un second dev

### Interdictions
- ❌ ALTER TABLE en SQL Editor sans fichier migration correspondant
- ❌ DROP COLUMN sans migration `08_cleanup_unused.sql` validée
- ❌ Modifier une RPC sans mettre à jour `05_rpc_functions.sql`
- ❌ Ajouter une policy RLS sans mettre à jour `04_rls_policies.sql`

### Workflow obligatoire
```
1. Écrire la migration → supabase/migrations/TIMESTAMP_desc.sql
2. git add + commit → "feat(db): ..."
3. Tester localement : supabase db reset (staging branch)
4. PR + review
5. Merger → apply en production via Supabase MCP ou CLI
6. Vérifier via 09_validation_tests.sql
```

---

## 5. Schéma canonique E-Samba (état cible)

### Enums

| Enum | Valeurs |
|------|---------|
| `role_type` | organizer, manager, driver, mechanic |
| `access_universe` | real, temporary, internal |
| `account_status` | pending, active, suspended, expired, disabled |
| `closure_status` | pending, approved, rejected |
| `driver_score_level` | green, yellow, orange, red |

### Tables et colonnes minimales

#### `profils`
| Colonne | Type | Nullable | Default | Notes |
|---------|------|----------|---------|-------|
| user_id | uuid | NO | — | PK, FK auth.users.id |
| email | text | YES | — | sync depuis auth.users |
| full_name | text | YES | — | |
| phone | text | YES | — | |
| role | role_type | YES | — | rôle métier principal |
| universe | access_universe | YES | 'real' | real/temporary/internal |
| status | account_status | YES | 'pending' | |
| expires_at | timestamptz | YES | — | comptes temporaires |
| fleet_id | uuid | YES | — | FK flottes (optionnel) |
| mfa_required | boolean | YES | false | |
| last_login_at | timestamptz | YES | — | |
| created_by | uuid | YES | — | FK auth.users |
| created_at | timestamptz | NO | now() | |
| updated_at | timestamptz | YES | now() | trigger auto |
| ~~access_universe~~ | ~~text~~ | — | — | DOUBLON → supprimer |
| ~~clerk_user_id~~ | ~~text~~ | — | — | obsolète si Supabase Auth |
| ~~id~~ | ~~uuid~~ | — | — | redondant avec user_id |

#### `organisations`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| name | text | NO | — |
| country_code | text | NO | 'CM' |
| plan_code | text | NO | 'free' |
| max_fleets | smallint | NO | 1 |
| is_enterprise | boolean | NO | false |
| is_demo | boolean | NO | false |
| billing_email | text | YES | — |
| slug | text | YES | — |
| logo_url | text | YES | — |
| created_by | uuid | YES | — |
| created_at | timestamptz | NO | now() |
| updated_at | timestamptz | NO | now() |

#### `flottes`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| org_id | uuid | YES | — | FK organisations |
| name | text | NO | — |
| collection_policy | text | NO | 'mix' |
| billing_status | text | NO | 'trial' |
| trial_ends_at | timestamptz | YES | — |
| plan_cache | text | NO | 'free' |
| is_demo | boolean | NO | false |
| clerk_org_id | text | YES | — |
| created_at | timestamptz | NO | now() |

#### `flotte_adhesions`
| Colonne | Type | Nullable | Default | Notes |
|---------|------|----------|---------|-------|
| id | uuid | NO | gen_random_uuid() | |
| fleet_id | uuid | NO | — | FK flottes |
| user_id | uuid | NO | — | FK auth.users |
| role | role_type | NO | — | |
| universe | access_universe | NO | 'real' | |
| is_active | boolean | NO | true | |
| statut | text | YES | 'actif' | **À AJOUTER** |
| rejoint_le | timestamptz | YES | now() | **À AJOUTER** |
| created_at | timestamptz | NO | now() | |
| updated_at | timestamptz | YES | now() | **À AJOUTER** |

UNIQUE : `(user_id, fleet_id)`

#### `onboarding_progress`
| Colonne | Type | Nullable | Default | Notes |
|---------|------|----------|---------|-------|
| id | uuid | NO | gen_random_uuid() | |
| org_id | uuid | NO | — | FK organisations, UNIQUE |
| user_id | uuid | NO | — | FK auth.users |
| step | integer | NO | 1 | default 0 en prod → corriger |
| completed | boolean | NO | false | |
| steps_data | jsonb | NO | '{}' | colonne active |
| ~~data~~ | ~~jsonb~~ | YES | '{}' | **LEGACY → supprimer** |
| created_at | timestamptz | NO | now() | |
| updated_at | timestamptz | NO | now() | |

#### `vehicules`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| fleet_id | uuid | NO | — |
| registration | text | NO | — |
| brand | text | YES | — |
| model | text | YES | — |
| year | integer | YES | — |
| current_km | integer | NO | 0 |
| status | text | NO | 'active' |
| billing_status | text | NO | 'active' |
| blocked_reason | text | YES | — |
| suspended_at | timestamptz | YES | — |
| suspension_reason | text | YES | — |
| created_at | timestamptz | NO | now() |

#### `affectations_vehicules`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| fleet_id | uuid | NO | — |
| vehicle_id | uuid | NO | — |
| driver_user_id | uuid | NO | — |
| starts_at | timestamptz | NO | now() |
| ends_at | timestamptz | YES | — |
| is_active | boolean | NO | true |
| created_by | uuid | NO | — |
| created_at | timestamptz | NO | now() |

#### `creneaux_conducteurs`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| assignment_id | uuid | NO | — |
| km_start | integer | NO | — |
| km_end | integer | YES | — |
| started_at | timestamptz | NO | now() |
| ended_at | timestamptz | YES | — |
| status | text | NO | 'open' |

#### `clotures_creneaux`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| shift_id | uuid | NO | — |
| revenue_declared | integer | NO | — |
| expected_revenue | integer | YES | — |
| revenue_gap | integer | YES | — |
| collection_mode | text | NO | — |
| proof_type | text | NO | — |
| proof_value | text | NO | — |
| status | closure_status | NO | 'pending' |
| validated_by | uuid | YES | — |
| validated_at | timestamptz | YES | — |
| created_at | timestamptz | NO | now() |

#### `scores_conducteurs`
| Colonne | Type | Nullable | Default | Notes |
|---------|------|----------|---------|-------|
| id | uuid | NO | gen_random_uuid() | |
| driver_user_id | uuid | NO | — | |
| fleet_id | uuid | NO | — | |
| score_total | numeric | YES | 100 | **default manquant** |
| financial_score | numeric | NO | 100.00 | |
| incidents_score | numeric | YES | — | |
| closure_delay_score | numeric | YES | — | |
| shift_discipline_score | numeric | YES | — | |
| operational_stability_score | numeric | YES | — | |
| score_level | driver_score_level | NO | 'green' | |
| model_version | text | YES | — | |
| model_metadata | jsonb | YES | — | |
| last_calculated_at | timestamptz | NO | now() | |
| created_at | timestamptz | NO | now() | |

#### `access_codes`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| code | text | NO | — |
| label | text | YES | — |
| universe | access_universe | NO | 'temporary' |
| role | role_type | YES | — |
| role_target | text | NO | — |
| max_uses | integer | NO | 1 |
| used_count | integer | NO | 0 |
| access_days | integer | NO | 7 |
| is_active | boolean | NO | true |
| fleet_id | uuid | YES | — |
| target_email | text | YES | — |
| created_by | uuid | YES | — |
| used_by | uuid | YES | — |
| used_at | timestamptz | YES | — |
| last_used_at | timestamptz | YES | — |
| expires_at | timestamptz | NO | now()+30d |
| created_at | timestamptz | NO | now() |

#### `audit_logs`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| actor_id | uuid | YES | — |
| actor_email | text | YES | — |
| action | text | NO | — |
| target_id | uuid | YES | — |
| target_email | text | YES | — |
| metadata | jsonb | YES | '{}' |
| ip_address | text | YES | — |
| created_at | timestamptz | YES | now() |

---

## 6. Synchronisation frontend ↔ RPC ↔ RLS par domaine

| Domaine | Frontend attend | RPC utilisée | RLS critique |
|---------|----------------|--------------|--------------|
| Auth | profils.role, profils.universe | — | profils SELECT own |
| Onboarding | steps_data, step, completed | sauvegarder_progression_onboarding | INSERT user_can_manage_org |
| Dashboard | fleet_id, org_id, billing_status | fleet_activation_metrics | flottes SELECT member |
| Véhicules | registration, status, current_km | creer_vehicule_esamba | vehicules SELECT fleet member |
| Chauffeurs | driver_user_id, score_total | get_top_driver_scores | scores SELECT fleet |
| Clôtures | revenue_declared, status | — | clotures SELECT shift owner |
| Scoring | score_total, score_level | calculer_score_conducteur_v2 | scores_conducteurs own |
| Démo | is_demo, expires_at | prospect_create_account | demo_profiles own |
| Admin | universe='internal' | — | admin_profiles |

---

## 7. Checklist de validation finale

### Auth
- [ ] Signup email → profil créé automatiquement (trigger)
- [ ] `profils.email` synchronisé depuis `auth.users.email`
- [ ] `profils.status = 'active'` après confirmation email
- [ ] Login → session JWT valide, `auth.uid()` = user_id

### Onboarding
- [ ] POST `/rest/v1/onboarding_progress` → 200 (via RPC, plus de 400)
- [ ] `steps_data` persisté correctement en JSONB
- [ ] `step` incrémente de 1 à 4
- [ ] `completed = true` après finalisation
- [ ] Redirect vers /dashboard après complétion

### Dashboard
- [ ] Accès refusé si pas de flotte active (RLS)
- [ ] `billing_status` affiché correctement
- [ ] Véhicules visibles uniquement pour la bonne flotte

### Véhicules
- [ ] Création via `creer_vehicule_esamba` → 200
- [ ] `registration` unique par flotte (contrainte CHECK ou application)
- [ ] Véhicule visible uniquement aux membres de la flotte

### Chauffeurs
- [ ] `score_total` non null après premier calcul
- [ ] `get_top_driver_scores` retourne au moins 1 résultat
- [ ] Clôture créneau → score recalculé

### RLS — refus
- [ ] anon ne peut pas lire `profils`
- [ ] Driver ne peut pas lire les scores d'une autre flotte
- [ ] Prospect ne peut pas accéder au dashboard production

### Comptes
- [ ] Compte démo expire après `expires_at`
- [ ] Compte interne (`universe = 'internal'`) accessible admin only
- [ ] `access_codes` utilisable une seule fois (`max_uses = 1`)

### Vercel
- [ ] Build sans erreur TypeScript
- [ ] Variables d'env `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` présentes
- [ ] Aucun 400/500 dans les network requests après login
