# Guide d'utilisation des fonctions RPC de vérification

## Installation

1. Ouvrez votre **Supabase Dashboard** : https://app.supabase.com
2. Sélectionnez votre projet
3. Allez dans **SQL Editor** (menu de gauche)
4. Ouvrez le fichier `supabase/rpc-consistency.sql`
5. **Copiez tout le contenu** et collez-le dans l'éditeur SQL
6. Cliquez sur **Run** ou appuyez sur `Ctrl+Enter`

## Fonctions disponibles

### 1. `check_orphaned_data()`

Vérifie toutes les données orphelines (foreign keys cassées).

**Utilisation** :
```sql
SELECT check_orphaned_data();
```

**Retourne** : Un JSON avec le nombre et les détails de chaque type de données orphelines.

### 2. `check_logical_inconsistencies()`

Vérifie les incohérences logiques dans les données.

**Utilisation** :
```sql
SELECT check_logical_inconsistencies();
```

**Retourne** : Un JSON avec toutes les incohérences détectées (shifts fermés incomplets, etc.).

### 3. `check_constraint_violations()`

Détecte les violations de contraintes uniques (doublons).

**Utilisation** :
```sql
SELECT check_constraint_violations();
```

**Retourne** : Un JSON avec les doublons détectés.

### 4. `get_database_stats()`

Retourne les statistiques générales de la base de données.

**Utilisation** :
```sql
SELECT get_database_stats();
```

**Retourne** : Un JSON avec le nombre d'enregistrements par table.

### 5. `cleanup_orphaned_data(p_dry_run boolean)`

Nettoie les données orphelines.

**Paramètres** :
- `p_dry_run` : `true` pour simulation, `false` pour suppression réelle

**Utilisation** :

Simulation (recommandé en premier) :
```sql
SELECT cleanup_orphaned_data(true);
```

Nettoyage réel :
```sql
SELECT cleanup_orphaned_data(false);
```

**Retourne** : Un JSON avec le nombre d'enregistrements supprimés par table.

## Exemples d'utilisation

### Vérification complète

```sql
-- Vérifier les données orphelines
SELECT check_orphaned_data();

-- Vérifier les incohérences
SELECT check_logical_inconsistencies();

-- Vérifier les violations
SELECT check_constraint_violations();

-- Statistiques
SELECT get_database_stats();
```

### Nettoyage sécurisé

```sql
-- 1. D'abord, simuler le nettoyage
SELECT cleanup_orphaned_data(true);

-- 2. Vérifier les résultats de la simulation
-- 3. Si tout est correct, exécuter le nettoyage réel
SELECT cleanup_orphaned_data(false);
```

### Consulter les logs d'audit

#### Requêtes de base

```sql
-- Voir toutes les opérations de nettoyage (les plus récentes en premier)
SELECT * FROM database_cleanup_audit
ORDER BY executed_at DESC;

-- Voir les 10 dernières opérations
SELECT * FROM database_cleanup_audit
ORDER BY executed_at DESC
LIMIT 10;

-- Voir uniquement les opérations réelles (non dry-run)
SELECT * FROM database_cleanup_audit
WHERE dry_run = false
ORDER BY executed_at DESC;

-- Voir uniquement les simulations (dry-run)
SELECT * FROM database_cleanup_audit
WHERE dry_run = true
ORDER BY executed_at DESC;
```

#### Requêtes d'analyse

```sql
-- Compter les opérations par table
SELECT 
  table_name,
  COUNT(*) as nombre_operations,
  COUNT(*) FILTER (WHERE dry_run = false) as operations_reelles,
  COUNT(*) FILTER (WHERE dry_run = true) as simulations
FROM database_cleanup_audit
GROUP BY table_name
ORDER BY nombre_operations DESC;

-- Voir les opérations par utilisateur
SELECT 
  executed_by,
  COUNT(*) as nombre_operations,
  MIN(executed_at) as premiere_operation,
  MAX(executed_at) as derniere_operation
FROM database_cleanup_audit
WHERE executed_by IS NOT NULL
GROUP BY executed_by
ORDER BY derniere_operation DESC;

-- Statistiques par jour
SELECT 
  DATE(executed_at) as date,
  COUNT(*) as total_operations,
  COUNT(*) FILTER (WHERE dry_run = false) as operations_reelles,
  COUNT(DISTINCT table_name) as tables_affectees
FROM database_cleanup_audit
GROUP BY DATE(executed_at)
ORDER BY date DESC;

-- Détails des opérations réelles avec informations utilisateur
SELECT 
  dca.id,
  dca.table_name,
  dca.operation_type,
  dca.executed_at,
  dca.dry_run,
  p.full_name as utilisateur,
  dca.record_details
FROM database_cleanup_audit dca
LEFT JOIN profiles p ON p.user_id = dca.executed_by
WHERE dca.dry_run = false
ORDER BY dca.executed_at DESC;
```

## Format des résultats JSON

Les fonctions retournent des objets JSON structurés. Pour une meilleure lisibilité dans Supabase, vous pouvez utiliser :

```sql
-- Formater le JSON pour une meilleure lecture
SELECT jsonb_pretty(check_orphaned_data());
```

## Sécurité

- Toutes les fonctions utilisent `security definer` pour s'exécuter avec les permissions nécessaires
- Le nettoyage enregistre toutes les opérations dans `database_cleanup_audit`
- Les politiques RLS protègent la table d'audit
- Toujours tester avec `dry_run = true` avant le nettoyage réel

## Notes importantes

1. **Sauvegardez votre base de données** avant d'exécuter `cleanup_orphaned_data(false)`
2. **Testez toujours en mode dry-run** d'abord
3. **Vérifiez les résultats** avant de procéder au nettoyage réel
4. Les fonctions sont idempotentes : vous pouvez les exécuter plusieurs fois sans problème
