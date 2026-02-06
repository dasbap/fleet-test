# 🔍 Vérification de Cohérence Base de Données / Backend

## 📋 Objectif

Ce document décrit la vérification de cohérence entre la structure de la base de données et les références dans le code backend.

## ✅ Corrections Appliquées

### 1. Tables corrigées dans le backend

#### `src/hooks/useDashboardStats.ts`
- ❌ **Avant** : `driver_vehicle_assignments` et `profiles`
- ✅ **Après** : `affectations_vehicules` et `profils`

```typescript
// Avant
assignments:driver_vehicle_assignments(
  driver:profiles(full_name)
)

// Après
assignments:affectations_vehicules(
  driver:profils!affectations_vehicules_driver_user_id_fkey(full_name)
)
```

#### `src/hooks/useDriverShifts.ts`
- ❌ **Avant** : `driver_vehicle_assignments`, `vehicles`, `driver_shifts_assignment_id_fkey`
- ✅ **Après** : `affectations_vehicules`, `vehicules`, `creneaux_conducteurs_assignment_id_fkey`

```typescript
// Avant
assignment:driver_vehicle_assignments!driver_shifts_assignment_id_fkey(
  vehicle:vehicles!driver_vehicle_assignments_vehicle_id_fkey(...)
)

// Après
assignment:affectations_vehicules!creneaux_conducteurs_assignment_id_fkey(
  vehicle:vehicules!affectations_vehicules_vehicle_id_fkey(...)
)
```

## 📊 Tables de la Base de Données

### Tables Principales (Noms Français)

| Table Base de Données | Nom Utilisé dans Backend | Statut |
|----------------------|-------------------------|--------|
| `organisations` | `organisations` | ✅ Cohérent |
| `flottes` | `flottes` | ✅ Cohérent |
| `profils` | `profils` | ✅ Cohérent (corrigé) |
| `flotte_adhesions` | `flotte_adhesions` | ✅ Cohérent |
| `flotte_invitations` | `flotte_invitations` | ✅ Cohérent |
| `vehicules` | `vehicules` | ✅ Cohérent (corrigé) |
| `affectations_vehicules` | `affectations_vehicules` | ✅ Cohérent (corrigé) |
| `creneaux_conducteurs` | `creneaux_conducteurs` | ✅ Cohérent |
| `clotures_creneaux` | `clotures_creneaux` | ✅ Cohérent |
| `incidents` | `incidents` | ✅ Cohérent |
| `travaux_maintenance` | `travaux_maintenance` | ✅ Cohérent |
| `preuves_maintenance` | `preuves_maintenance` | ✅ Cohérent |

### Tables Obsolètes (Noms Anglais - À Éviter)

| Table Obsolète | Table Correcte | Statut |
|----------------|----------------|--------|
| `orgs` | `organisations` | ⚠️ Ne pas utiliser |
| `fleets` | `flottes` | ⚠️ Ne pas utiliser |
| `profiles` | `profils` | ⚠️ Ne pas utiliser |
| `fleet_memberships` | `flotte_adhesions` | ⚠️ Ne pas utiliser |
| `vehicles` | `vehicules` | ⚠️ Ne pas utiliser |
| `driver_vehicle_assignments` | `affectations_vehicules` | ⚠️ Ne pas utiliser |
| `driver_shifts` | `creneaux_conducteurs` | ⚠️ Ne pas utiliser |
| `shift_closures` | `clotures_creneaux` | ⚠️ Ne pas utiliser |

## 🔧 Fonctions RPC Vérifiées

### Fonctions RPC Utilisées par le Backend

| Fonction RPC | Utilisée dans | Statut |
|--------------|---------------|--------|
| `fermer_creneau` | `useDriverShifts.ts`, `ShiftClosureForm.tsx` | ✅ Vérifiée |
| `calculer_recette_attendue` | `useDriverShifts.ts`, `ShiftClosureForm.tsx` | ✅ Vérifiée |
| `generer_alertes_automatiques` | `useAlerts.ts` | ✅ Vérifiée |
| `calculer_score_conducteur` | `useDriverScores.ts` | ✅ Vérifiée |
| `create_esamba_fleet` | `Settings.tsx`, `CreateFleet.tsx` | ✅ Vérifiée |
| `upsert_fleet_membership` | `Settings.tsx`, `useFleetMembers.ts` | ✅ Vérifiée |
| `create_esamba_vehicle` | `Settings.tsx` | ✅ Vérifiée |
| `create_esamba_invitation` | `Settings.tsx` | ✅ Vérifiée |
| `affecter_vehicule` | `useAssignments.ts` | ✅ Vérifiée |
| `accepter_invitation` | `useAcceptInvitation.ts` | ✅ Vérifiée |
| `verifier_sante_systeme` | `useSystemHealth.ts` | ✅ Vérifiée |
| `reparer_adhesion_orpheline` | `useSystemHealth.ts` | ✅ Vérifiée |
| `ensure_user_profile` | `useEnsureProfile.ts` | ✅ Vérifiée |
| `check_esamba_2024` | `useEsambaDataVerification.ts` | ✅ Vérifiée |
| `add_member_by_email` | `useFleetMembers.ts` | ✅ Vérifiée |
| `rechercher_utilisateurs` | `useSearchUsers.ts` | ✅ Vérifiée |

## 🧪 Script de Vérification

Un script SQL complet a été créé pour vérifier la cohérence :

**Fichier** : `supabase/verify-database-backend-consistency.sql`

### Comment l'utiliser

1. Ouvrez Supabase SQL Editor
2. Copiez-collez le contenu du script
3. Exécutez le script (Run ou F5)
4. Analysez les résultats pour identifier les incohérences

### Ce que le script vérifie

1. ✅ **Existence des tables** : Vérifie que toutes les tables utilisées par le backend existent
2. ✅ **Colonnes des tables** : Vérifie que toutes les colonnes référencées existent
3. ✅ **Fonctions RPC** : Vérifie que toutes les fonctions RPC appelées existent
4. ✅ **Types ENUM** : Vérifie que les types ENUM ont les bonnes valeurs
5. ✅ **Foreign Keys** : Vérifie les relations entre tables
6. ✅ **Index** : Vérifie les index pour les performances
7. ✅ **Politiques RLS** : Vérifie que les politiques RLS sont en place

## 📝 Checklist de Vérification

Avant de déployer, vérifiez :

- [ ] Toutes les tables utilisées dans le backend existent dans la base de données
- [ ] Tous les noms de tables sont en français (pas d'anciens noms anglais)
- [ ] Toutes les colonnes référencées existent dans les tables
- [ ] Toutes les fonctions RPC appelées existent et fonctionnent
- [ ] Les types ENUM ont les bonnes valeurs
- [ ] Les foreign keys sont correctement configurées
- [ ] Les index sont présents pour les performances
- [ ] Les politiques RLS sont en place pour la sécurité

## 🔍 Points d'Attention

### 1. Noms de Tables dans les Requêtes Supabase

Lors de l'utilisation de `.from()` dans Supabase, utilisez toujours les noms français :

```typescript
// ✅ Correct
supabase.from('vehicules')
supabase.from('flotte_adhesions')
supabase.from('profils')

// ❌ Incorrect
supabase.from('vehicles')
supabase.from('fleet_memberships')
supabase.from('profiles')
```

### 2. Relations dans les Requêtes Supabase

Lors de l'utilisation de relations dans les requêtes Supabase, utilisez les bons noms de foreign keys :

```typescript
// ✅ Correct
.select(`
  *,
  driver:profils!affectations_vehicules_driver_user_id_fkey(full_name)
`)

// ❌ Incorrect
.select(`
  *,
  driver:profiles(full_name)
`)
```

### 3. Query Keys (Clés de Cache)

Les query keys peuvent utiliser n'importe quel nom (elles ne sont pas liées aux tables) :

```typescript
// ✅ Acceptable (ce sont juste des clés de cache)
queryKey: ['vehicles', fleetId]
queryKey: ['fleet-vehicles-overview']
```

## 🚀 Prochaines Étapes

1. **Exécuter le script de vérification** dans Supabase SQL Editor
2. **Vérifier les résultats** et corriger les incohérences détectées
3. **Tester l'application** pour s'assurer que tout fonctionne
4. **Documenter** toute nouvelle table ou fonction RPC ajoutée

## 📚 Ressources

- **Schéma de la base de données** : `supabase/schema.sql`
- **Script de vérification** : `supabase/verify-database-backend-consistency.sql`
- **Documentation Supabase** : https://supabase.com/docs
