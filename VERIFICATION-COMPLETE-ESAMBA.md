# ✅ Vérification Complète des Données ESAMBA

## 🎯 Objectif

Vérifier que toutes les données principales ESAMBA sont créées, en particulier la **Flotte ESAMBA**.

## 📋 Données à vérifier

1. ✅ **Organisation ESAMBA**
2. ✅ **Flotte ESAMBA** ⭐ (PRIORITAIRE)
3. ✅ **Véhicule ESAMBA-001**
4. ✅ **Invitation ESAMBA-2024**
5. ℹ️ **Membership Organizer** (créé via l'application)

## 🚀 Instructions de vérification

### Étape 1 : Exécuter le script de vérification

1. **Ouvrez Supabase SQL Editor**
   - Allez sur https://app.supabase.com
   - Sélectionnez votre projet
   - Cliquez sur "SQL Editor"

2. **Exécutez le script de vérification**
   - Ouvrez le fichier `supabase/verify-esamba-data-complete.sql`
   - Copiez-collez tout le contenu dans l'éditeur SQL
   - Cliquez sur "Run" ou appuyez sur F5

3. **Analysez les résultats**
   - Le script affiche un rapport détaillé pour chaque élément
   - Vérifiez que tous les statuts sont "✅ CRÉÉ(E)"
   - **Particulièrement** : Vérifiez que la Flotte ESAMBA est "✅ CRÉÉE"

### Étape 2 : Vérification rapide de la Flotte ESAMBA

Pour une vérification rapide de la Flotte ESAMBA uniquement :

```sql
-- Vérification rapide Flotte ESAMBA
SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ FLOTTE ESAMBA CRÉÉE'
    ELSE '❌ FLOTTE ESAMBA ABSENTE'
  END as statut,
  COUNT(*) as nombre,
  STRING_AGG(id::text, ', ') as ids,
  STRING_AGG(name, ', ') as noms
FROM fleets
WHERE name = 'Flotte ESAMBA';
```

### Étape 3 : Vérification dans l'application

1. **Lancez l'application**
   ```bash
   npm run dev
   ```

2. **Allez sur la page Paramètres**
   - Ouvrez http://localhost:8080/settings
   - Connectez-vous si nécessaire

3. **Vérifiez la section "Vérification des données"**
   - Cliquez sur **"Actualiser"** (bouton en haut à droite)
   - Vérifiez que tous les éléments sont marqués **"Créée"** avec un badge vert :
     - ✅ Organisation ESAMBA
     - ✅ **Flotte ESAMBA** ⭐
     - ✅ Membership Organizer
     - ✅ Véhicule ESAMBA-001
     - ✅ Invitation ESAMBA-2024

## ✅ Résultats attendus

### Dans Supabase SQL Editor

Après exécution du script `verify-esamba-data-complete.sql`, vous devriez voir :

#### 1. Organisation ESAMBA
```
verification: 1. ORGANISATION ESAMBA
statut: ✅ CRÉÉE
nombre: 1
```

#### 2. Flotte ESAMBA ⭐
```
verification: 2. FLOTTE ESAMBA ⭐
statut: ✅ CRÉÉE
nombre: 1
noms: Flotte ESAMBA
politiques: mix
organisations: Organisation ESAMBA
```

#### 3. Véhicule ESAMBA-001
```
verification: 3. VÉHICULE ESAMBA-001
statut: ✅ CRÉÉ
nombre: 1
immatriculations: ESAMBA-001
vehicules: Toyota Corolla
flottes: Flotte ESAMBA
```

#### 4. Invitation ESAMBA-2024
```
verification: 4. INVITATION ESAMBA-2024
statut: ✅ CRÉÉE
nombre: 1
codes: ESAMBA-2024
flottes: Flotte ESAMBA
```

#### 5. Résumé Global
```
section: RÉSUMÉ GLOBAL
organisation_count: 1
flotte_count: 1 ✅
vehicule_count: 1
invitation_count: 1
statut_global: ✅ DONNÉES PRINCIPALES CRÉÉES
```

### Dans l'application

Dans la section "Vérification des données", tous les éléments doivent avoir :
- Badge vert avec icône de checkmark
- Texte "Créée" ou "Créé"
- **Particulièrement** : Flotte ESAMBA doit être en vert ✅

## 🔍 Vérifications manuelles spécifiques

### Vérifier uniquement la Flotte ESAMBA

```sql
-- Vérification détaillée de la Flotte ESAMBA
SELECT 
  f.id,
  f.name,
  f.collection_policy,
  o.name as organisation,
  f.created_at,
  (SELECT COUNT(*) FROM vehicles v WHERE v.fleet_id = f.id) as vehicules,
  (SELECT COUNT(*) FROM fleet_invitations fi WHERE fi.fleet_id = f.id) as invitations
FROM fleets f
LEFT JOIN orgs o ON o.id = f.org_id
WHERE f.name = 'Flotte ESAMBA';
```

### Vérifier toutes les relations de la Flotte ESAMBA

```sql
-- Toutes les relations de la Flotte ESAMBA
SELECT 
  'Organisation' as type,
  o.name as nom
FROM fleets f
JOIN orgs o ON o.id = f.org_id
WHERE f.name = 'Flotte ESAMBA'
UNION ALL
SELECT 
  'Véhicule',
  v.registration
FROM fleets f
JOIN vehicles v ON v.fleet_id = f.id
WHERE f.name = 'Flotte ESAMBA'
UNION ALL
SELECT 
  'Invitation',
  fi.code
FROM fleets f
JOIN fleet_invitations fi ON fi.fleet_id = f.id
WHERE f.name = 'Flotte ESAMBA';
```

## 🐛 Dépannage

### Si la Flotte ESAMBA n'apparaît pas

1. **Vérifiez qu'elle existe dans la base**
   ```sql
   SELECT * FROM fleets WHERE name = 'Flotte ESAMBA';
   ```
   Si aucun résultat, exécutez le script de création :
   ```sql
   -- Voir supabase/test-create-esamba-complete.sql
   ```

2. **Vérifiez les politiques RLS**
   ```sql
   SELECT * FROM pg_policies 
   WHERE tablename = 'fleets';
   ```
   Assurez-vous que les politiques permettent la lecture.

3. **Vérifiez dans l'application**
   - Ouvrez la console du navigateur (F12)
   - Regardez s'il y a des erreurs
   - Vérifiez que la fonction `check_esamba_2024()` fonctionne

### Si certains éléments manquent

1. **Exécutez le script de création**
   - `supabase/test-create-esamba-complete.sql`
   - Crée toutes les données principales

2. **Créez via l'application**
   - Allez sur `/settings`
   - Cliquez sur "Créer les données ESAMBA-2024"
   - Cela créera aussi le membership organizer

## 📝 Checklist de vérification

- [ ] Script `verify-esamba-data-complete.sql` exécuté avec succès
- [ ] Organisation ESAMBA : ✅ CRÉÉE
- [ ] **Flotte ESAMBA : ✅ CRÉÉE** ⭐
- [ ] Véhicule ESAMBA-001 : ✅ CRÉÉ
- [ ] Invitation ESAMBA-2024 : ✅ CRÉÉE
- [ ] Dans l'application, tous les éléments sont verts
- [ ] La Flotte ESAMBA apparaît bien en vert dans l'interface
- [ ] Aucune erreur dans la console du navigateur

## 🎯 Test final

Pour un test complet, exécutez cette requête qui vérifie tout :

```sql
SELECT 
  'TEST FINAL' as test,
  (SELECT COUNT(*) > 0 FROM orgs WHERE name = 'Organisation ESAMBA') as org_ok,
  (SELECT COUNT(*) > 0 FROM fleets WHERE name = 'Flotte ESAMBA') as flotte_ok,
  (SELECT COUNT(*) > 0 FROM vehicles v
   JOIN fleets f ON f.id = v.fleet_id
   WHERE f.name = 'Flotte ESAMBA' 
     AND v.registration = 'ESAMBA-001') as vehicule_ok,
  (SELECT COUNT(*) > 0 FROM fleet_invitations fi
   JOIN fleets f ON f.id = fi.fleet_id
   WHERE f.name = 'Flotte ESAMBA' 
     AND fi.code = 'ESAMBA-2024') as invitation_ok,
  CASE 
    WHEN (SELECT COUNT(*) > 0 FROM orgs WHERE name = 'Organisation ESAMBA')
     AND (SELECT COUNT(*) > 0 FROM fleets WHERE name = 'Flotte ESAMBA')
     AND (SELECT COUNT(*) > 0 FROM vehicles v
          JOIN fleets f ON f.id = v.fleet_id
          WHERE f.name = 'Flotte ESAMBA' 
            AND v.registration = 'ESAMBA-001')
     AND (SELECT COUNT(*) > 0 FROM fleet_invitations fi
          JOIN fleets f ON f.id = fi.fleet_id
          WHERE f.name = 'Flotte ESAMBA' 
            AND fi.code = 'ESAMBA-2024')
    THEN '✅ TOUT EST OK'
    ELSE '❌ PROBLÈME DÉTECTÉ'
  END as resultat;
```

Tous les champs doivent être `true` et le résultat doit être `✅ TOUT EST OK`.
