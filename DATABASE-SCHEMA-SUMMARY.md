# 📊 RÉSUMÉ DU SCHÉMA BASE DE DONNÉES - Smart Fleet Africa

**Schéma réel en base :** tables en français (`organisations`, `flottes`, `profils`, `flotte_adhesions`, `flotte_invitations`, `vehicules`, etc.). Les anciens noms anglais (orgs, fleets, fleet_memberships, fleet_invitations) sont obsolètes après migration.

## 📋 TABLES ET COLONNES CLÉS

### 1. **organisations** (ex. orgs)
**RLS : OFF** ❌

| Colonne | Type | Obligatoire | Description |
|---------|------|-------------|-------------|
| `id` | uuid | ✅ | Clé primaire (généré automatiquement) |
| `name` | text | ✅ | Nom de l'organisation |
| `country_code` | text | ✅ | Code pays (défaut: 'CM') |
| `created_at` | timestamptz | ✅ | Date de création |

---

### 2. **flottes** (ex. fleets)
**RLS : OFF** ❌

| Colonne | Type | Obligatoire | Description |
|---------|------|-------------|-------------|
| `id` | uuid | ✅ | Clé primaire (généré automatiquement) |
| `org_id` | uuid | ✅ | Référence vers `organisations.id` (FK) |
| `name` | text | ✅ | Nom de la flotte |
| `collection_policy` | text | ✅ | Politique de collecte: 'cash'\|'momo'\|'mix' (défaut: 'mix') |
| `created_at` | timestamptz | ✅ | Date de création |

---

### 3. **profils** (ex. profiles)
**RLS : OFF** ❌

| Colonne | Type | Obligatoire | Description |
|---------|------|-------------|-------------|
| `user_id` | uuid | ✅ | Clé primaire (FK vers `auth.users.id`) |
| `full_name` | text | ❌ | Nom complet |
| `phone` | text | ❌ | Téléphone |
| `created_at` | timestamptz | ✅ | Date de création |

---

### 4. **flotte_adhesions** (ex. fleet_memberships – Membres de flotte)
**RLS : ON** ✅

| Colonne | Type | Obligatoire | Description |
|---------|------|-------------|-------------|
| `id` | uuid | ✅ | Clé primaire (généré automatiquement) |
| `fleet_id` | uuid | ✅ | Référence vers `flottes.id` (FK) |
| `user_id` | uuid | ✅ | Référence vers `auth.users.id` (FK) |
| `role` | role_type | ✅ | Enum: 'organizer'\|'manager'\|'driver'\|'mechanic' |
| `is_active` | boolean | ✅ | Statut actif (défaut: true) |
| `created_at` | timestamptz | ✅ | Date de création |
| **Contrainte unique** : `(fleet_id, user_id, role)` |

**Politiques RLS :**
- ✅ `memberships_select_self_or_manager_org` : SELECT si `user_id = auth.uid()` ou `has_role(fleet_id, 'manager')` ou `has_role(fleet_id, 'organizer')`
- ✅ `memberships_update_manager_org` : UPDATE si `has_role(fleet_id, 'manager')` ou `has_role(fleet_id, 'organizer')`
- ✅ `memberships_delete_manager_org` : DELETE si `has_role(fleet_id, 'manager')` ou `has_role(fleet_id, 'organizer')`

---

### 5. **flotte_invitations** (ex. fleet_invitations – Invitations de flotte)
**RLS : ON** ✅

| Colonne | Type | Obligatoire | Description |
|---------|------|-------------|-------------|
| `id` | uuid | ✅ | Clé primaire (généré automatiquement) |
| `fleet_id` | uuid | ✅ | Référence vers `flottes.id` (FK) |
| `code` | text | ✅ | Code d'invitation (UNIQUE) |
| `expires_at` | timestamptz | ❌ | Date d'expiration |
| `max_uses` | int | ❌ | Nombre maximum d'utilisations |
| `current_uses` | int | ✅ | Nombre d'utilisations actuelles (défaut: 0) |
| `created_by` | uuid | ❌ | Référence vers `auth.users.id` (FK) |
| `created_at` | timestamptz | ✅ | Date de création |

**Politiques RLS :**
- ✅ `invitations_public_read` : SELECT pour `anon` et `authenticated` (lecture publique)
- ✅ `invitations_write_manager_org` : INSERT si `has_role(fleet_id, 'manager')` ou `has_role(fleet_id, 'organizer')`
- ✅ `invitations_update_manager_org` : UPDATE si `has_role(fleet_id, 'manager')` ou `has_role(fleet_id, 'organizer')`

---

### 6. **vehicules** (ex. vehicles)
**RLS : ON** ✅

| Colonne | Type | Obligatoire | Description |
|---------|------|-------------|-------------|
| `id` | uuid | ✅ | Clé primaire (généré automatiquement) |
| `fleet_id` | uuid | ✅ | Référence vers `flottes.id` (FK) |
| `registration` | text | ✅ | Immatriculation |
| `brand` | text | ❌ | Marque |
| `model` | text | ❌ | Modèle |
| `year` | int | ❌ | Année |
| `current_km` | int | ✅ | Kilométrage actuel (défaut: 0) |
| `status` | vehicle_status | ✅ | Enum: 'ok'\|'blocked' (défaut: 'ok') |
| `blocked_reason` | text | ❌ | Raison du blocage |
| `created_at` | timestamptz | ✅ | Date de création |
| **Contrainte unique** : `(fleet_id, registration)` |

**Politiques RLS :**
- ✅ `vehicles_read_manager_org` : SELECT si `has_role(fleet_id, 'manager')` ou `has_role(fleet_id, 'organizer')`
- ✅ `vehicles_write_manager_org` : INSERT si `has_role(fleet_id, 'manager')` ou `has_role(fleet_id, 'organizer')`
- ✅ `vehicles_update_manager_org` : UPDATE si `has_role(fleet_id, 'manager')` ou `has_role(fleet_id, 'organizer')`
- ✅ `vehicles_read_driver_assigned` : SELECT si le véhicule est assigné au driver (`driver_vehicle_assignments.is_active = true`)

---

### 7. **affectations_vehicules** (ex. driver_vehicle_assignments)
**RLS : ON** ✅

| Colonne | Type | Obligatoire | Description |
|---------|------|-------------|-------------|
| `id` | uuid | ✅ | Clé primaire (généré automatiquement) |
| `fleet_id` | uuid | ✅ | Référence vers `flottes.id` (FK) |
| `vehicle_id` | uuid | ✅ | Référence vers `vehicules.id` (FK) |
| `driver_user_id` | uuid | ✅ | Référence vers `auth.users.id` (FK) |
| `starts_at` | timestamptz | ✅ | Date de début (défaut: now()) |
| `ends_at` | timestamptz | ❌ | Date de fin |
| `is_active` | boolean | ✅ | Statut actif (défaut: true) |
| `created_by` | uuid | ✅ | Référence vers `auth.users.id` (FK) |
| `created_at` | timestamptz | ✅ | Date de création |
| **Index unique** : Un seul assignment actif par driver (`is_active = true`) |
| **Index unique** : Un seul assignment actif par véhicule (`is_active = true`) |

**Politiques RLS :**
- ✅ `assignments_create_manager_org` : INSERT si `has_role(fleet_id, 'manager')` ou `has_role(fleet_id, 'organizer')`
- ✅ `assignments_read_manager_org` : SELECT si `has_role(fleet_id, 'manager')` ou `has_role(fleet_id, 'organizer')`
- ✅ `assignments_read_driver_self` : SELECT si `driver_user_id = auth.uid()`

---

### 8. **creneaux_conducteurs** (ex. driver_shifts)
**RLS : ON** ✅

| Colonne | Type | Obligatoire | Description |
|---------|------|-------------|-------------|
| `id` | uuid | ✅ | Clé primaire (généré automatiquement) |
| `assignment_id` | uuid | ✅ | Référence vers `affectations_vehicules.id` (FK) |
| `km_start` | int | ✅ | Kilométrage de début |
| `km_end` | int | ❌ | Kilométrage de fin |
| `started_at` | timestamptz | ✅ | Date de début (défaut: now()) |
| `ended_at` | timestamptz | ❌ | Date de fin |
| `status` | text | ✅ | Statut: 'open'\|'closed' (défaut: 'open') |

**Politiques RLS :**
- ✅ `shifts_driver_select` : SELECT si le shift appartient au driver via `assignment_id`
- ✅ `shifts_driver_insert` : INSERT si le driver a un assignment actif
- ✅ `shifts_manager_org_select` : SELECT si `has_role(fleet_id, 'manager')` ou `has_role(fleet_id, 'organizer')`

---

### 9. **clotures_creneaux** (ex. driver_shift_closures)
**RLS : ON** ✅

| Colonne | Type | Obligatoire | Description |
|---------|------|-------------|-------------|
| `id` | uuid | ✅ | Clé primaire (généré automatiquement) |
| `shift_id` | uuid | ✅ | Référence vers `creneaux_conducteurs.id` (FK, UNIQUE) |
| `revenue_declared` | int | ✅ | Revenu déclaré |
| `collection_mode` | text | ✅ | Mode: 'cash'\|'momo'\|'mix' |
| `proof_type` | text | ✅ | Type de preuve: 'photo'\|'momo_ref'\|'doc' |
| `proof_value` | text | ✅ | Valeur de la preuve |
| `status` | closure_status | ✅ | Enum: 'pending'\|'validated'\|'rejected' (défaut: 'pending') |
| `validated_by` | uuid | ❌ | Référence vers `auth.users.id` (FK) |
| `validated_at` | timestamptz | ❌ | Date de validation |
| `created_at` | timestamptz | ✅ | Date de création |

**Politiques RLS :**
- ✅ `closures_driver_insert` : INSERT si le shift appartient au driver
- ✅ `closures_manager_update` : UPDATE si `has_role(fleet_id, 'manager')` ou `has_role(fleet_id, 'organizer')`

---

### 10. **incidents** (Incidents)
**RLS : ON** ✅

| Colonne | Type | Obligatoire | Description |
|---------|------|-------------|-------------|
| `id` | uuid | ✅ | Clé primaire (généré automatiquement) |
| `vehicle_id` | uuid | ✅ | Référence vers `vehicules.id` (FK) |
| `driver_user_id` | uuid | ✅ | Référence vers `auth.users.id` (FK) |
| `severity` | text | ✅ | Gravité (défaut: 'medium') |
| `description` | text | ✅ | Description |
| `evidence_path` | text | ❌ | Chemin vers la preuve |
| `created_at` | timestamptz | ✅ | Date de création |

**Politiques RLS :**
- ✅ `incidents_read_fleet` : SELECT si `has_role(fleet_id, 'manager')` ou `has_role(fleet_id, 'organizer')` ou `has_role(fleet_id, 'mechanic')`
- ✅ `incidents_driver_insert` : INSERT si `driver_user_id = auth.uid()`
- ✅ `incidents_driver_select` : SELECT si `driver_user_id = auth.uid()`

---

### 11. **maintenance_jobs** (Tâches de maintenance)
**RLS : ON** ✅

| Colonne | Type | Obligatoire | Description |
|---------|------|-------------|-------------|
| `id` | uuid | ✅ | Clé primaire (généré automatiquement) |
| `vehicle_id` | uuid | ✅ | Référence vers `vehicules.id` (FK) |
| `fleet_id` | uuid | ✅ | Référence vers `flottes.id` (FK) |
| `created_from_incident_id` | uuid | ❌ | Référence vers `incidents.id` (FK) |
| `priority` | text | ✅ | Priorité (défaut: 'medium') |
| `status` | text | ✅ | Statut: 'queued'\|'in_progress'\|'ready'\|'blocked' (défaut: 'queued') |
| `created_at` | timestamptz | ✅ | Date de création |
| `closed_at` | timestamptz | ❌ | Date de clôture |

**Politiques RLS :**
- ✅ `jobs_read_mgr_org_mech` : SELECT si `has_role(fleet_id, 'manager')` ou `has_role(fleet_id, 'organizer')` ou `has_role(fleet_id, 'mechanic')`

---

### 12. **maintenance_evidence** (Preuves de maintenance)
**RLS : ON** ✅

| Colonne | Type | Obligatoire | Description |
|---------|------|-------------|-------------|
| `id` | uuid | ✅ | Clé primaire (généré automatiquement) |
| `job_id` | uuid | ✅ | Référence vers `maintenance_jobs.id` (FK) |
| `kind` | text | ✅ | Type: 'before'\|'after' |
| `file_path` | text | ✅ | Chemin vers le fichier |
| `created_by` | uuid | ✅ | Référence vers `auth.users.id` (FK) |
| `created_at` | timestamptz | ✅ | Date de création |

**Politiques RLS :**
- ✅ `evidence_insert_mech` : INSERT si `true` (à durcir en v2 - actuellement permissif)

---

### 13. **maintenance_checklists** (Checklists de maintenance)
**RLS : ON** ✅

| Colonne | Type | Obligatoire | Description |
|---------|------|-------------|-------------|
| `id` | uuid | ✅ | Clé primaire (généré automatiquement) |
| `job_id` | uuid | ✅ | Référence vers `maintenance_jobs.id` (FK) |
| `items` | jsonb | ✅ | Items de la checklist (JSON) |
| `signed_by` | uuid | ✅ | Référence vers `auth.users.id` (FK) |
| `signed_at` | timestamptz | ✅ | Date de signature |

---

### 14. **plans** (Plans d'abonnement)
**RLS : OFF** ❌

| Colonne | Type | Obligatoire | Description |
|---------|------|-------------|-------------|
| `id` | uuid | ✅ | Clé primaire (généré automatiquement) |
| `code` | text | ✅ | Code du plan (UNIQUE) |
| `name` | text | ✅ | Nom du plan |
| `price_per_vehicle` | int | ✅ | Prix par véhicule (ex: 10000 FCFA) |
| `min_commitment_days` | int | ✅ | Engagement minimum en jours (défaut: 60) |
| `is_active` | boolean | ✅ | Statut actif (défaut: true) |

---

### 15. **payments** (Paiements)
**RLS : OFF** ❌

| Colonne | Type | Obligatoire | Description |
|---------|------|-------------|-------------|
| `id` | uuid | ✅ | Clé primaire (généré automatiquement) |
| `org_id` | uuid | ✅ | Référence vers `organisations.id` (FK) |
| `provider` | text | ✅ | Fournisseur de paiement |
| `amount` | int | ✅ | Montant |
| `currency` | text | ✅ | Devise (défaut: 'XAF') |
| `external_ref` | text | ❌ | Référence externe |
| `status` | text | ✅ | Statut: 'initiated'\|'succeeded'\|'failed' (défaut: 'initiated') |
| `idempotency_key` | text | ✅ | Clé d'idempotence |
| `raw_payload` | jsonb | ❌ | Données brutes (JSON) |
| `created_at` | timestamptz | ✅ | Date de création |
| **Contrainte unique** : `(provider, idempotency_key)` |

---

### 16. **subscriptions** (Abonnements)
**RLS : ON** ✅

| Colonne | Type | Obligatoire | Description |
|---------|------|-------------|-------------|
| `id` | uuid | ✅ | Clé primaire (généré automatiquement) |
| `fleet_id` | uuid | ✅ | Référence vers `flottes.id` (FK) |
| `plan_id` | uuid | ✅ | Référence vers `plans.id` (FK) |
| `payment_id` | uuid | ❌ | Référence vers `payments.id` (FK) |
| `starts_at` | timestamptz | ✅ | Date de début |
| `ends_at` | timestamptz | ✅ | Date de fin |
| `status` | text | ✅ | Statut (défaut: 'active') |

**Politiques RLS :**
- ✅ RLS activé mais **aucune politique définie** (à compléter)

---

### 17. **vehicle_entitlements** (Droits d'accès véhicules)
**RLS : ON** ✅

| Colonne | Type | Obligatoire | Description |
|---------|------|-------------|-------------|
| `id` | uuid | ✅ | Clé primaire (généré automatiquement) |
| `vehicle_id` | uuid | ✅ | Référence vers `vehicules.id` (FK) |
| `subscription_id` | uuid | ✅ | Référence vers `subscriptions.id` (FK) |
| `active` | boolean | ✅ | Statut actif (défaut: true) |
| **Contrainte unique** : `(vehicle_id, subscription_id)` |

**Politiques RLS :**
- ✅ RLS activé mais **aucune politique définie** (à compléter)

---

### 18. **qr_tokens** (Tokens QR)
**RLS : ON** ✅

| Colonne | Type | Obligatoire | Description |
|---------|------|-------------|-------------|
| `id` | uuid | ✅ | Clé primaire (généré automatiquement) |
| `vehicle_id` | uuid | ✅ | Référence vers `vehicules.id` (FK) |
| `token_hash` | text | ✅ | Hash du token (UNIQUE) |
| `scope` | text | ✅ | Portée: 'subscription'\|'debug' (défaut: 'subscription') |
| `expires_at` | timestamptz | ✅ | Date d'expiration |
| `created_by` | uuid | ✅ | Référence vers `auth.users.id` (FK) |
| `created_at` | timestamptz | ✅ | Date de création |

**Politiques RLS :**
- ✅ RLS activé mais **aucune politique définie** (à compléter)

---

## 🔐 RÉSUMÉ RLS (Row Level Security)

### ✅ Tables avec RLS ACTIVÉ :

1. **flotte_adhesions** - Politiques définies ✅
2. **vehicules** - Politiques définies ✅
3. **affectations_vehicules** - Politiques définies ✅
4. **creneaux_conducteurs** - Politiques définies ✅
5. **clotures_creneaux** - Politiques définies ✅
6. **incidents** - Politiques définies ✅
7. **maintenance_jobs** (travaux_maintenance) - Politiques définies ✅
8. **maintenance_evidence** (preuves_maintenance) - Politique partielle (à durcir) ⚠️
9. **maintenance_checklists** - RLS activé mais **aucune politique** ❌
10. **subscriptions** (abonnements) - RLS activé mais **aucune politique** ❌
11. **vehicle_entitlements** (droits_vehicules) - RLS activé mais **aucune politique** ❌
12. **qr_tokens** (jetons_qr) - RLS activé mais **aucune politique** ❌
13. **flotte_invitations** - Politiques définies ✅

### ❌ Tables avec RLS DÉSACTIVÉ :

1. **organisations**
2. **flottes**
3. **profils**
4. **plans**
5. **payments**

---

## 🔧 FONCTIONS HELPER

### `has_role(p_fleet_id uuid, p_role role_type)`
Retourne `true` si l'utilisateur connecté (`auth.uid()`) a le rôle spécifié dans la flotte.

---

## 📝 NOTES IMPORTANTES

1. **RLS manquantes** : Les tables `maintenance_checklists`, `subscriptions`, `vehicle_entitlements`, et `qr_tokens` ont RLS activé mais **aucune politique définie**. Elles sont donc **inaccessibles** par défaut.

2. **maintenance_evidence** : La politique `evidence_insert_mech` est permissive (`true`) et doit être durcie en v2.

3. **Contraintes uniques** :
   - `flotte_adhesions` : `(fleet_id, user_id, role)`
   - `vehicules` : `(fleet_id, registration)`
   - `driver_shift_closures` : `(shift_id)`
   - `vehicle_entitlements` : `(vehicle_id, subscription_id)`
   - `payments` : `(provider, idempotency_key)`

4. **Index uniques partiels** :
   - Un seul assignment actif par driver
   - Un seul assignment actif par véhicule

---

## 🚀 RPC (noms français déployés)

1. **`affecter_vehicule(...)`** : Assignation atomique d'un véhicule avec vérifications
2. **`fermer_creneau(...)`** : Fermeture d'un créneau avec clôture
3. **`accepter_invitation(p_code)`** : Accepte une invitation à rejoindre une flotte
4. **`ajouter_membre_par_email(p_fleet_id, p_email, p_role)`** : Ajoute un membre par email
5. **`creer_ou_mettre_a_jour_adhesion_flotte(...)`** : Upsert adhésion (rôle)
6. **`creer_flotte_esamba`, `creer_vehicule_esamba`, `creer_invitation_esamba`** : Création flotte/véhicule/invitation
7. **`assurer_profil_utilisateur`, `verifier_esamba_2024`, `verifier_sante_systeme`, `reparer_adhesion_orpheline`** : Helpers

---

*Document généré à partir de `supabase/schema.sql`*
