# Guide de test des fonctions RPC

Ce guide explique comment tester les trois fonctions RPC avec des données réelles.

## Fonctions testées

1. **`calculer_recette_attendue(p_shift_id uuid)`**
   - Calcule la recette attendue pour un créneau basé sur le kilométrage et l'historique du chauffeur
   - Met à jour `clotures_creneaux.expected_revenue` et `revenue_gap`

2. **`calculer_score_conducteur(p_driver_user_id uuid, p_fleet_id uuid)`**
   - Calcule le score d'un chauffeur basé sur ses performances financières
   - Met à jour ou crée un enregistrement dans `scores_conducteurs`

3. **`generer_alertes_automatiques(p_fleet_id uuid)`**
   - Génère des alertes automatiques pour une flotte
   - Détecte : clôtures manquantes, écarts récurrents, chauffeurs à risque, véhicules bloqués
   - Retourne le nombre d'alertes créées

## Méthode 1 : Via Supabase SQL Editor (Recommandé)

### Étapes

1. **Ouvrir Supabase Dashboard**
   - Allez sur https://app.supabase.com
   - Sélectionnez votre projet
   - Ouvrez le **SQL Editor**

2. **Exécuter le script de test**
   - Ouvrez le fichier `supabase/test-rpc-functions.sql`
   - Copiez tout le contenu
   - Collez dans le SQL Editor
   - Cliquez sur **Run** (ou appuyez sur `Ctrl+Enter`)

3. **Consulter les résultats**
   - Les résultats s'affichent dans l'onglet **Results**
   - Les messages détaillés sont dans l'onglet **Logs** (messages `RAISE NOTICE`)

### Résultats attendus

#### Test 1 : calculer_recette_attendue
- ✅ Trouve un créneau fermé avec clôture
- ✅ Calcule la recette attendue
- ✅ Met à jour les colonnes `expected_revenue` et `revenue_gap`

#### Test 2 : calculer_score_conducteur
- ✅ Trouve un chauffeur avec des clôtures validées
- ✅ Calcule le score (green/orange/red)
- ✅ Crée ou met à jour l'enregistrement dans `scores_conducteurs`

#### Test 3 : generer_alertes_automatiques
- ✅ Trouve une flotte avec des données
- ✅ Génère les alertes automatiques
- ✅ Retourne le nombre d'alertes créées

## Méthode 2 : Via script PowerShell

### Prérequis

- PowerShell installé
- Variables d'environnement configurées :
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`

### Exécution

```powershell
# Depuis le dossier scripts/
.\test-rpc-functions.ps1

# Ou avec paramètres explicites
.\test-rpc-functions.ps1 -SupabaseUrl "https://xxx.supabase.co" -SupabaseKey "eyJ..."
```

**Note** : L'API REST de Supabase ne supporte pas l'exécution directe de SQL. Le script PowerShell affichera des instructions pour utiliser le SQL Editor.

## Interprétation des résultats

### Messages de succès
- `✅ Fonction exécutée avec succès` : La fonction s'est exécutée sans erreur
- `✅ Colonnes mises à jour` : Les données ont été correctement enregistrées
- `✅ Score créé/mis à jour` : Le score a été calculé et sauvegardé

### Messages d'avertissement
- `⚠️ La fonction a retourné NULL` : La fonction n'a pas pu calculer de résultat (données insuffisantes)
- `⚠️ La fonction a retourné un nombre négatif` : Résultat inattendu

### Messages d'erreur
- `❌ Erreur lors de l'exécution` : Une exception s'est produite (voir le message d'erreur détaillé)
- `❌ Impossible de trouver [données]` : Aucune donnée de test disponible

## Vérifications manuelles

### Vérifier calculer_recette_attendue

```sql
-- Vérifier que les colonnes sont remplies
SELECT 
  c.id as shift_id,
  c.km_start,
  c.km_end,
  cc.revenue_declared,
  cc.expected_revenue,
  cc.revenue_gap
FROM creneaux_conducteurs c
JOIN clotures_creneaux cc ON cc.shift_id = c.id
WHERE c.status = 'closed'
  AND cc.expected_revenue IS NOT NULL
ORDER BY cc.created_at DESC
LIMIT 10;
```

### Vérifier calculer_score_conducteur

```sql
-- Vérifier les scores calculés
SELECT 
  sc.driver_user_id,
  p.full_name,
  sc.fleet_id,
  f.name as fleet_name,
  sc.score_level,
  sc.financial_score,
  sc.last_calculated_at
FROM scores_conducteurs sc
LEFT JOIN profils p ON p.user_id = sc.driver_user_id
LEFT JOIN flottes f ON f.id = sc.fleet_id
ORDER BY sc.last_calculated_at DESC;
```

### Vérifier generer_alertes_automatiques

```sql
-- Vérifier les alertes générées
SELECT 
  aa.id,
  aa.fleet_id,
  f.name as fleet_name,
  aa.alert_type,
  aa.severity,
  aa.message,
  aa.resolved,
  aa.created_at
FROM alertes_automatiques aa
LEFT JOIN flottes f ON f.id = aa.fleet_id
WHERE aa.resolved = false
ORDER BY aa.created_at DESC;
```

## Dépannage

### Aucune donnée de test trouvée

Si les tests indiquent qu'aucune donnée n'est disponible :

1. **Pour calculer_recette_attendue** :
   - Créez un créneau (`creneaux_conducteurs`) avec `status = 'closed'`
   - Ajoutez `km_start` et `km_end` (avec `km_end > km_start`)
   - Créez une clôture (`clotures_creneaux`) avec `status = 'validated'`

2. **Pour calculer_score_conducteur** :
   - Assurez-vous qu'il existe des clôtures validées pour le chauffeur
   - Les clôtures doivent avoir `expected_revenue` calculé

3. **Pour generer_alertes_automatiques** :
   - Assurez-vous qu'il existe une flotte avec des données
   - Créez des créneaux fermés sans clôture pour tester les alertes "missing_closure"

### Erreurs de permissions

Si vous obtenez des erreurs de permissions :

```sql
-- Vérifier les permissions sur les fonctions
SELECT 
  proname,
  prosecdef,
  proacl
FROM pg_proc
WHERE proname IN (
  'calculer_recette_attendue',
  'calculer_score_conducteur',
  'generer_alertes_automatiques'
);

-- Accorder les permissions si nécessaire
GRANT EXECUTE ON FUNCTION calculer_recette_attendue(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION calculer_score_conducteur(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION generer_alertes_automatiques(uuid) TO authenticated;
```

## Prochaines étapes

Après avoir validé que les fonctions RPC fonctionnent correctement :

1. Intégrer les appels dans le code applicatif (voir le plan d'application)
2. Tester les intégrations dans l'interface utilisateur
3. Vérifier les performances avec des volumes de données réels
4. Configurer des tâches planifiées pour `generer_alertes_automatiques`

## Fichiers associés

- `supabase/test-rpc-functions.sql` : Script SQL de test
- `scripts/test-rpc-functions.ps1` : Script PowerShell d'aide
- `supabase/migrations/20250205000001_add_scores_and_alerts.sql` : Définition des fonctions
