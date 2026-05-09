# Guide d'application des migrations SQL

Ce guide vous explique comment appliquer les migrations SQL créées pour corriger le schéma métier.

## Prérequis

- Accès au [Supabase Dashboard](https://app.supabase.com)
- Droits d'administration sur le projet Supabase
- Les fichiers de migration dans `supabase/migrations/`

## Étape 1 : Application de la première migration

### Fichier : `supabase/migrations/20250205000000_fix_schema_metier.sql`

1. **Connectez-vous au Supabase Dashboard**
   - Allez sur https://app.supabase.com
   - Sélectionnez votre projet

2. **Ouvrez le SQL Editor**
   - Dans le menu de gauche, cliquez sur **SQL Editor**
   - Cliquez sur **New Query** (ou utilisez l'éditeur existant)

3. **Copiez le contenu de la migration**
   - Ouvrez le fichier `supabase/migrations/20250205000000_fix_schema_metier.sql`
   - Sélectionnez tout le contenu (Ctrl+A / Cmd+A)
   - Copiez (Ctrl+C / Cmd+C)

4. **Collez dans l'éditeur SQL**
   - Collez le contenu dans l'éditeur SQL de Supabase
   - Vérifiez que tout le contenu est présent

5. **Exécutez la migration**
   - Cliquez sur **Run** (ou appuyez sur `Ctrl+Enter` / `Cmd+Enter`)
   - Attendez la fin de l'exécution
   - Vérifiez qu'il n'y a pas d'erreurs dans les résultats

6. **Vérification**
   Exécutez cette requête pour vérifier que les tables principales ont été créées :

   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
     AND table_name IN ('organisations', 'flottes', 'profils', 'affectations_vehicules')
   ORDER BY table_name;
   ```

   Vous devriez voir les 4 tables listées.

## Étape 2 : Application de la deuxième migration

### Fichier : `supabase/migrations/20250205000001_add_scores_and_alerts.sql`

1. **Dans le même SQL Editor**
   - Créez une nouvelle requête (New Query)
   - Ou effacez le contenu précédent

2. **Copiez le contenu de la deuxième migration**
   - Ouvrez le fichier `supabase/migrations/20250205000001_add_scores_and_alerts.sql`
   - Copiez tout le contenu

3. **Collez et exécutez**
   - Collez dans l'éditeur SQL
   - Exécutez (Run ou Ctrl+Enter)
   - Vérifiez qu'il n'y a pas d'erreurs

4. **Vérification**
   Exécutez ces requêtes pour vérifier :

   ```sql
   -- Vérifier les nouvelles tables
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
     AND table_name IN ('scores_conducteurs', 'alertes_automatiques')
   ORDER BY table_name;

   -- Vérifier les enums
   SELECT typname FROM pg_type 
   WHERE typname IN ('driver_score_level', 'alert_type');
   ```

   Vous devriez voir les 2 tables et les 2 enums.

## Étape 3 : Vérification de la préservation des données

Exécutez cette requête pour vérifier que vos données existantes sont toujours présentes :

```sql
-- Compter les enregistrements dans chaque table principale
SELECT 
  'flotte_adhesions' as table_name, COUNT(*) as count FROM flotte_adhesions
UNION ALL
SELECT 'vehicules', COUNT(*) FROM vehicules
UNION ALL
SELECT 'creneaux_conducteurs', COUNT(*) FROM creneaux_conducteurs
UNION ALL
SELECT 'clotures_creneaux', COUNT(*) FROM clotures_creneaux
UNION ALL
SELECT 'incidents', COUNT(*) FROM incidents
UNION ALL
SELECT 'travaux_maintenance', COUNT(*) FROM travaux_maintenance;
```

Comparez les résultats avec vos attentes. Les nombres devraient être identiques à avant les migrations.

## Étape 4 : Vérification des Foreign Keys

Exécutez cette requête pour vérifier que toutes les FK ont été créées :

```sql
-- Vérifier que toutes les FK sont créées
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
ORDER BY tc.table_name, kcu.column_name;
```

Vous devriez voir une liste complète de toutes les relations entre les tables.

## Étape 5 : Vérification des colonnes ajoutées

Vérifiez que la table `vehicules` a bien toutes ses colonnes :

```sql
-- Vérifier les colonnes de vehicules
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'vehicules'
ORDER BY ordinal_position;
```

Vous devriez voir toutes les colonnes : `id`, `fleet_id`, `registration`, `brand`, `model`, `year`, `current_km`, `status`, `blocked_reason`, `created_at`.

## Étape 6 : Tests des fonctions RPC

### Test 1 : calculer_recette_attendue

```sql
-- Trouver un shift_id de test
SELECT c.id as shift_id, c.km_start, c.km_end
FROM creneaux_conducteurs c
WHERE c.status = 'closed'
  AND c.km_end IS NOT NULL
LIMIT 1;

-- Tester la fonction (remplacer <shift_id> par un ID réel de la requête précédente)
SELECT calculer_recette_attendue('<shift_id>'::uuid);

-- Vérifier que les colonnes ont été mises à jour
SELECT expected_revenue, revenue_gap, revenue_declared
FROM clotures_creneaux
WHERE shift_id = '<shift_id>'::uuid;
```

### Test 2 : calculer_score_conducteur

```sql
-- Trouver un driver_user_id de test
SELECT DISTINCT a.driver_user_id, f.id as fleet_id
FROM affectations_vehicules a
JOIN flottes f ON f.id = a.fleet_id
LIMIT 1;

-- Tester la fonction (remplacer les UUIDs)
SELECT calculer_score_conducteur(
  '<driver_user_id>'::uuid,
  '<fleet_id>'::uuid
);

-- Vérifier le score créé
SELECT * FROM scores_conducteurs
WHERE driver_user_id = '<driver_user_id>'::uuid
  AND fleet_id = '<fleet_id>'::uuid;
```

### Test 3 : generer_alertes_automatiques

```sql
-- Trouver un fleet_id de test
SELECT id, name FROM flottes LIMIT 1;

-- Tester la fonction (remplacer <fleet_id>)
SELECT generer_alertes_automatiques('<fleet_id>'::uuid);

-- Vérifier les alertes créées
SELECT * FROM alertes_automatiques
WHERE fleet_id = '<fleet_id>'::uuid
ORDER BY created_at DESC;
```

## Dépannage

### Erreur : "relation already exists"
Les migrations sont idempotentes et utilisent `IF NOT EXISTS`, donc cette erreur ne devrait pas se produire. Si elle apparaît, vérifiez que vous avez bien copié tout le contenu du fichier.

### Erreur : "column already exists"
Normalement géré par les vérifications `IF NOT EXISTS`. Si l'erreur persiste, vérifiez que la colonne n'existe pas déjà avec un type différent.

### Erreur : "foreign key constraint violation"
Cela signifie qu'il y a des données orphelines. Vérifiez les données avant d'appliquer les FK :
```sql
-- Exemple : vérifier les véhicules sans flotte
SELECT v.id, v.fleet_id 
FROM vehicules v
LEFT JOIN flottes f ON f.id = v.fleet_id
WHERE f.id IS NULL;
```

### Les données ont disparu
Les migrations ne suppriment pas de données. Si des données manquent, vérifiez :
1. Que vous êtes sur le bon projet Supabase
2. Que vous n'avez pas exécuté de commandes DROP par erreur
3. Les logs dans Supabase Dashboard > Logs

## Prochaines étapes

Une fois les migrations appliquées avec succès :

1. ✅ Vérifiez que toutes les tables existent
2. ✅ Vérifiez que toutes les FK sont créées
3. ✅ Testez les fonctions RPC
4. ✅ Testez l'application avec les nouvelles fonctionnalités

Le code applicatif a déjà été mis à jour pour utiliser les nouvelles fonctionnalités :
- Calcul automatique de la recette attendue lors de la clôture
- Affichage des scores dans la page Drivers
- Affichage des alertes dans la page Alerts
- Indicateur de chauffeurs à risque dans le Dashboard

## Support

Si vous rencontrez des problèmes :
1. Vérifiez les logs dans Supabase Dashboard > Logs
2. Consultez le fichier `VERIFICATION-SCHEMA-METIER.md` pour plus de détails
3. Vérifiez que vous avez bien exécuté les migrations dans l'ordre
