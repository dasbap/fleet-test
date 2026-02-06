# 🧪 Test Complet - Création de la Flotte ESAMBA

## 📋 Objectif

Créer la "Flotte ESAMBA" et vérifier que tous les éléments sont marqués en vert (créés) dans l'interface.

## 🚀 Instructions de test

### Étape 1 : Exécuter le script SQL de test

1. **Ouvrez Supabase SQL Editor**
   - Allez sur https://app.supabase.com
   - Sélectionnez votre projet
   - Cliquez sur "SQL Editor"

2. **Exécutez le script de test**
   - Ouvrez le fichier `supabase/test-create-esamba-complete.sql`
   - Copiez-collez tout le contenu dans l'éditeur SQL
   - Cliquez sur "Run" ou appuyez sur F5
   - **Note** : Le script fonctionne sans authentification utilisateur

3. **Vérifiez les résultats**
   - Le script affichera des messages pour chaque étape
   - À la fin, vous verrez un tableau avec le statut de chaque élément
   - Les éléments principaux doivent être marqués "✅ Créé(e)"
   - **Note** : Le membership organizer sera créé via l'application (nécessite un utilisateur authentifié)

### Étape 2 : Vérifier dans l'application

1. **Lancez l'application**
   ```bash
   npm run dev
   ```

2. **Allez sur la page Paramètres**
   - Ouvrez http://localhost:8080/settings
   - Connectez-vous si nécessaire

3. **Vérifiez la section "Vérification des données"**
   - Cliquez sur **"Actualiser"** (bouton en haut à droite)
   - Tous les éléments doivent être marqués **"Créée"** avec un badge vert :
     - ✅ Organisation ESAMBA
     - ✅ Flotte ESAMBA
     - ✅ Membership Organizer
     - ✅ Véhicule ESAMBA-001
     - ✅ Invitation ESAMBA-2024

### Étape 3 : Tester la création via l'interface

Si vous voulez tester la création via l'interface (au lieu du script SQL) :

1. **Allez sur `/settings`**
2. **Cliquez sur "Créer les données ESAMBA-2024"**
3. **Attendez la confirmation de succès**
4. **Cliquez sur "Actualiser"** dans la section Vérification
5. **Vérifiez que tout est vert**

## ✅ Résultats attendus

### Dans Supabase SQL Editor

Après exécution du script `test-create-esamba-complete.sql`, vous devriez voir :

```
✅ Organisation ESAMBA créée : [uuid]
✅ Flotte ESAMBA créée : [uuid]
✅ Véhicule ESAMBA-001 créé : [uuid]
✅ Invitation ESAMBA-2024 créée : ESAMBA-2024
```

Et un tableau final avec :
- `organisation`: `true`
- `flotte`: `true` ✅
- `membership_organizer`: `false` ou `true` (selon si créé via l'app)
- `vehicule_esamba_001`: `true`
- `invitation_esamba_2024`: `true`
- `statut`: `✅ DONNÉES PRINCIPALES CRÉÉES (Membership à créer via l'app)`

**Note importante** : Le membership organizer nécessite un utilisateur authentifié et sera créé automatiquement lorsque vous utiliserez l'application (bouton "Créer les données ESAMBA-2024").

### Dans l'application

Dans la section "Vérification des données", tous les éléments doivent avoir :
- Badge vert avec icône de checkmark
- Texte "Créée" ou "Créé"

## 🔍 Vérification manuelle dans Supabase

Si vous voulez vérifier manuellement :

```sql
-- Vérifier la flotte
SELECT 
  f.id,
  f.name,
  f.collection_policy,
  o.name as organisation_name,
  f.created_at
FROM fleets f
JOIN orgs o ON o.id = f.org_id
WHERE f.name = 'Flotte ESAMBA';

-- Vérifier avec la fonction RPC
SELECT * FROM check_esamba_2024();

-- Vérifier tous les éléments
SELECT 
  'Organisation' as type,
  COUNT(*) as count,
  CASE WHEN COUNT(*) > 0 THEN '✅' ELSE '❌' END as statut
FROM orgs WHERE name = 'Organisation ESAMBA'
UNION ALL
SELECT 'Flotte', COUNT(*), CASE WHEN COUNT(*) > 0 THEN '✅' ELSE '❌' END
FROM fleets WHERE name = 'Flotte ESAMBA'
UNION ALL
SELECT 'Véhicule', COUNT(*), CASE WHEN COUNT(*) > 0 THEN '✅' ELSE '❌' END
FROM vehicles v
JOIN fleets f ON f.id = v.fleet_id
WHERE f.name = 'Flotte ESAMBA' AND v.registration = 'ESAMBA-001'
UNION ALL
SELECT 'Invitation', COUNT(*), CASE WHEN COUNT(*) > 0 THEN '✅' ELSE '❌' END
FROM fleet_invitations fi
JOIN fleets f ON f.id = fi.fleet_id
WHERE f.name = 'Flotte ESAMBA' AND fi.code = 'ESAMBA-2024';
```

## 🐛 Dépannage

### Si la flotte n'apparaît pas en vert

1. **Vérifiez que le script SQL a bien été exécuté**
   ```sql
   -- Vérifier directement
   SELECT COUNT(*) FROM fleets WHERE name = 'Flotte ESAMBA';
   -- Doit retourner au moins 1
   
   -- Ou utiliser la fonction (nécessite authentification)
   SELECT * FROM check_esamba_2024();
   ```
   La colonne `flotte` doit être `true`

2. **Vérifiez que vous êtes connecté avec le bon utilisateur**
   - La fonction `check_esamba_2024` vérifie le membership pour l'utilisateur actuel
   - Assurez-vous d'être connecté avec le même utilisateur qui a créé les données

3. **Rafraîchissez la page dans l'application**
   - Cliquez sur "Actualiser" dans la section Vérification
   - Ou rechargez la page complète (F5)

4. **Vérifiez les erreurs dans la console du navigateur**
   - Ouvrez les outils de développement (F12)
   - Regardez l'onglet "Console" pour voir s'il y a des erreurs

### Si certaines données ne sont pas créées

1. **Vérifiez que toutes les fonctions RPC existent**
   ```sql
   SELECT proname FROM pg_proc 
   WHERE proname IN (
     'create_esamba_fleet',
     'create_esamba_vehicle',
     'create_esamba_invitation',
     'upsert_fleet_membership',
     'check_esamba_2024'
   );
   ```
   Vous devriez voir 5 fonctions listées.

2. **Si des fonctions manquent, exécutez le script complet**
   - Exécutez `supabase/fix-all-issues-complete.sql` dans Supabase SQL Editor

## 📝 Notes importantes

- Le script SQL utilise `auth.uid()` pour identifier l'utilisateur actuel
- Assurez-vous d'être connecté dans Supabase avant d'exécuter le script
- Le script est idempotent : il peut être exécuté plusieurs fois sans problème
- Si les données existent déjà, elles ne seront pas dupliquées

## ✅ Checklist de test

- [ ] Script SQL `test-create-esamba-complete.sql` exécuté avec succès
- [ ] Tous les messages affichent "✅ Créé(e)"
- [ ] La fonction `check_esamba_2024()` retourne tous les éléments à `true`
- [ ] Dans l'application, tous les éléments sont marqués "Créée" (vert)
- [ ] Aucune erreur dans la console du navigateur
- [ ] Le bouton "Actualiser" fonctionne correctement
