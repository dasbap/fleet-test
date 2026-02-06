# 🔧 Correction des Profils Utilisateurs - Full Name

## 📋 Problème identifié

Les profils utilisateurs dans la base de données ont `full_name = null`, ce qui empêche l'affichage correct des noms dans l'application.

## ✅ Solution

Un script SQL a été créé pour :
1. **Créer les profils manquants** pour les utilisateurs existants
2. **Mettre à jour les profils** avec `full_name = null` en utilisant l'email comme base
3. **Améliorer le trigger** pour les nouveaux utilisateurs afin qu'il utilise l'email si `full_name` n'est pas disponible

## 🚀 Instructions d'exécution

### Étape 1 : Ouvrir Supabase SQL Editor

1. Allez sur https://app.supabase.com
2. Sélectionnez votre projet
3. Cliquez sur "SQL Editor" dans le menu de gauche

### Étape 2 : Exécuter le script de correction

1. Ouvrez le fichier `supabase/fix-profiles-full-name.sql`
2. Copiez tout le contenu
3. Collez-le dans l'éditeur SQL de Supabase
4. Cliquez sur "Run" ou appuyez sur `F5`

### Étape 3 : Vérifier les résultats

Le script affichera plusieurs sections de résultats :

1. **VÉRIFICATION DES PROFILS** : Statistiques sur les profils corrigés
2. **MEMBRES DE LA FLOTTE TEST (APRÈS CORRECTION)** : Liste des membres avec leurs `full_name` mis à jour
3. **STATISTIQUES PAR FLOTTE** : Vue d'ensemble par flotte

## 📊 Résultats attendus

Après exécution, vous devriez voir :
- ✅ Tous les profils ont un `full_name` (soit depuis les métadonnées, soit depuis l'email)
- ✅ Les membres de "Flotte Test" affichent maintenant leurs noms complets
- ✅ Le trigger est amélioré pour les futurs utilisateurs

## 🔍 Vérification manuelle

Pour vérifier manuellement que les corrections ont été appliquées :

```sql
-- Vérifier les profils de la Flotte Test
SELECT 
  fm.id as membership_id,
  fm.role,
  f.name as fleet_name,
  u.email,
  p.full_name,
  fm.created_at
FROM fleet_memberships fm
JOIN fleets f ON f.id = fm.fleet_id
LEFT JOIN auth.users u ON u.id = fm.user_id
LEFT JOIN profiles p ON p.user_id = fm.user_id
WHERE f.name = 'Flotte Test'
ORDER BY fm.created_at DESC;
```

Tous les `full_name` devraient maintenant être remplis (pas de `null`).

## 🔄 Amélioration du trigger

Le trigger `handle_new_user()` a été amélioré pour :
- Utiliser `full_name` depuis les métadonnées si disponible
- Sinon, utiliser la partie avant `@` de l'email comme nom par défaut
- Gérer les conflits si le profil existe déjà

Cette amélioration est également appliquée dans `supabase/schema.sql` pour les futurs déploiements.

## ⚠️ Notes importantes

- Le script est **idempotent** : vous pouvez l'exécuter plusieurs fois sans problème
- Les profils existants avec `full_name` déjà rempli ne seront pas modifiés
- Les nouveaux utilisateurs bénéficieront automatiquement de l'amélioration du trigger

## 🐛 En cas de problème

Si certains profils restent avec `full_name = null`, vérifiez :
1. Que l'utilisateur existe dans `auth.users`
2. Que l'utilisateur a un email valide
3. Que le profil existe dans `public.profiles`

Pour forcer la mise à jour d'un profil spécifique :

```sql
UPDATE public.profiles
SET full_name = (
  SELECT SPLIT_PART(email, '@', 1) 
  FROM auth.users 
  WHERE id = profiles.user_id
)
WHERE user_id = 'VOTRE_USER_ID_ICI'
  AND full_name IS NULL;
```
