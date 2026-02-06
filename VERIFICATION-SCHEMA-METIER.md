# Vérification et Correction du Schéma Métier

Date : 2025-02-05

## Résumé

Cette vérification a identifié et corrigé de nombreux écarts entre le schéma fonctionnel (PDF) et la base de données réelle. Deux migrations SQL ont été créées pour corriger tous les problèmes identifiés.

## Migrations créées

### 1. `20250205000000_fix_schema_metier.sql`
Migration principale qui corrige :
- ✅ Création des tables manquantes (organisations, flottes, profils, etc.)
- ✅ Correction de la table `vehicules` (ajout colonnes manquantes)
- ✅ Correction du type `status` dans `vehicules` pour utiliser l'enum
- ✅ Ajout de toutes les Foreign Keys manquantes

### 2. `20250205000001_add_scores_and_alerts.sql`
Extension du schéma pour le schéma fonctionnel :
- ✅ Création des enums `driver_score_level` et `alert_type`
- ✅ Création des tables `scores_conducteurs` et `alertes_automatiques`
- ✅ Ajout colonnes métier dans `clotures_creneaux` (expected_revenue, revenue_gap)
- ✅ Création des index de performance
- ✅ Création des fonctions RPC pour calculs métier

## Tables créées/corrigées

### Tables créées
1. **organisations** - Organisations multi-flottes
2. **flottes** - Flottes de véhicules
3. **profils** - Profils utilisateurs
4. **flotte_invitations** - Codes d'invitation pour rejoindre une flotte
5. **affectations_vehicules** - Affectations véhicule-chauffeur
6. **paiements** - Historique des paiements
7. **abonnements** - Abonnements aux plans
8. **droits_vehicules** - Droits d'accès par véhicule
9. **scores_conducteurs** - Scores des chauffeurs (vert/orange/rouge)
10. **alertes_automatiques** - Alertes automatiques du système

### Table corrigée : `vehicules`
Colonnes ajoutées :
- `registration` (text NOT NULL) - Immatriculation
- `brand` (text) - Marque
- `model` (text) - Modèle
- `year` (int) - Année
- `current_km` (int DEFAULT 0) - Kilométrage actuel
- `blocked_reason` (text) - Raison du blocage
- `created_at` (timestamptz) - Date de création

Correction du type `status` : conversion de `text` vers `vehicle_status` enum.

## Foreign Keys ajoutées

Toutes les relations manquantes ont été ajoutées :
- `flottes.org_id` → `organisations.id`
- `profils.user_id` → `auth.users.id`
- `flotte_adhesions.fleet_id` → `flottes.id`
- `flotte_adhesions.user_id` → `auth.users.id`
- `vehicules.fleet_id` → `flottes.id`
- `affectations_vehicules.*` → tables référencées
- `creneaux_conducteurs.assignment_id` → `affectations_vehicules.id`
- `clotures_creneaux.validated_by` → `auth.users.id`
- `incidents.*` → tables référencées
- `travaux_maintenance.*` → tables référencées
- Et toutes les autres relations nécessaires

## Enums créés

1. **driver_score_level** : `('green', 'orange', 'red')`
   - Utilisé pour le score des chauffeurs

2. **alert_type** : `('missing_closure', 'recurring_gap', 'risky_driver', 'vehicle_blocked')`
   - Types d'alertes automatiques

## Colonnes métier ajoutées

### Dans `clotures_creneaux`
- `expected_revenue` (int) - Recette attendue calculée
- `revenue_gap` (int) - Écart entre attendu et déclaré

## Fonctions RPC créées

### 1. `calculer_score_conducteur(p_driver_user_id uuid, p_fleet_id uuid)`
Calcule le score d'un chauffeur basé sur :
- Les écarts récurrents sur 30 jours
- Le pourcentage d'écart moyen
- Le nombre d'écarts significatifs

Retourne : `driver_score_level` (green/orange/red)

Met à jour automatiquement la table `scores_conducteurs`.

### 2. `calculer_recette_attendue(p_shift_id uuid)`
Calcule la recette attendue pour un créneau basé sur :
- Le kilométrage du créneau
- La moyenne historique du chauffeur (recette/km sur 30 jours)
- Valeur par défaut : 100 FCFA/km si pas d'historique

Retourne : `int` (montant attendu)

Met à jour automatiquement `clotures_creneaux.expected_revenue` et `revenue_gap`.

### 3. `generer_alertes_automatiques(p_fleet_id uuid)`
Génère les alertes automatiques pour une flotte :
1. **Clôtures manquantes** : Créneaux fermés sans clôture depuis 24h
2. **Écarts récurrents** : Chauffeurs avec 3+ écarts > 15% sur 30 jours
3. **Chauffeurs à risque** : Chauffeurs avec score rouge
4. **Véhicules bloqués** : Véhicules bloqués depuis plus de 7 jours

Retourne : `int` (nombre d'alertes créées)

## Index créés

Tous les index de performance ont été créés pour optimiser les requêtes :
- Index sur toutes les Foreign Keys
- Index sur les colonnes fréquemment filtrées (status, is_active, etc.)
- Index sur les colonnes de tri (created_at, started_at, etc.)

## Conformité avec le schéma fonctionnel

### Espace Chauffeur ✅
- ✅ Kilométrage début/fin
- ✅ Recette déclarée
- ✅ Mode d'encaissement
- ✅ Preuve de reversement
- ✅ Score chauffeur (Vert/Orange/Rouge) - **NOUVEAU**
- ✅ Statut véhicule OK/Bloqué - **CORRIGÉ**

### Espace Gestionnaire ✅
- ✅ Recette déclarée
- ✅ Recette attendue - **NOUVEAU**
- ✅ Écart (recette attendue - déclarée) - **NOUVEAU**
- ✅ Score financier - **NOUVEAU**
- ✅ Historique chauffeur
- ✅ Preuves fournies
- ✅ Écarts précédents
- ✅ Validation clôture

### Espace Mécanicien ✅
- ✅ File d'attente
- ✅ Priorité
- ✅ Historique maintenance
- ✅ Incidents signalés
- ✅ Preuves avant/après
- ✅ Checklist

### Espace Organisateur ✅
- ✅ Véhicules disponibles/bloqués
- ✅ Maintenances en attente
- ✅ Chauffeurs à risque - **NOUVEAU**

## Prochaines étapes

1. **Appliquer les migrations** dans Supabase :
   ```sql
   -- Exécuter dans l'ordre :
   -- 1. supabase/migrations/20250205000000_fix_schema_metier.sql
   -- 2. supabase/migrations/20250205000001_add_scores_and_alerts.sql
   ```

2. **Vérifier les données existantes** :
   - S'assurer que les données existantes sont préservées
   - Vérifier que les FK pointent vers des données valides

3. **Tester les fonctions RPC** :
   - Tester `calculer_score_conducteur` avec des données réelles
   - Tester `calculer_recette_attendue` lors de la clôture d'un créneau
   - Tester `generer_alertes_automatiques` pour une flotte

4. **Mettre à jour le code applicatif** :
   - Vérifier `src/hooks/useDriverShifts.ts` pour cohérence
   - Ajouter l'appel à `calculer_recette_attendue` lors de la clôture
   - Ajouter l'affichage des scores dans `src/hooks/useFleetReport.ts`
   - Ajouter l'affichage des alertes dans le dashboard

5. **Ajouter les politiques RLS** (si nécessaire) :
   - Pour `scores_conducteurs` : lecture par gestionnaire/organisateur et lecture de son propre score
   - Pour `alertes_automatiques` : lecture par gestionnaire/organisateur selon la flotte
   
   **Note** : Les nouvelles tables (`scores_conducteurs`, `alertes_automatiques`) n'ont pas de RLS activé par défaut. 
   Si nécessaire, ajouter les politiques dans une migration séparée ou dans le fichier de politiques RLS existant.

## Notes importantes

- Les migrations sont **idempotentes** : elles peuvent être exécutées plusieurs fois sans erreur
- Les données existantes sont **préservées** : les colonnes sont ajoutées avec des valeurs par défaut
- Les contraintes sont ajoutées **uniquement si elles n'existent pas** déjà
- Les index sont créés avec `IF NOT EXISTS` pour éviter les doublons

## Validation

Pour valider que tout fonctionne correctement :

```sql
-- Vérifier que toutes les tables existent
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Vérifier que toutes les FK existent
SELECT 
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- Vérifier que les fonctions RPC existent
SELECT proname 
FROM pg_proc 
WHERE proname IN (
  'calculer_score_conducteur',
  'calculer_recette_attendue',
  'generer_alertes_automatiques'
)
ORDER BY proname;
```
