# 🔧 Solution Complète - RLS et Contrainte Unique

## ❌ Problèmes identifiés

1. **Erreur RLS** : `new row violates row-level security policy for table "orgs"` / `"fleet_memberships"`
2. **Erreur contrainte unique** : `duplicate key value violates unique constraint "fleet_memberships_fleet_id_user_id_role_key"`

## ✅ Solution complète

### Étape 1 : Exécuter le script SQL

**Fichier** : `supabase/fix-all-issues-complete.sql`

Ce script fait **3 choses** :

1. **Crée les politiques RLS** pour :
   - `orgs` : SELECT, INSERT, UPDATE, DELETE
   - `fleets` : SELECT, INSERT, UPDATE, DELETE
   - `fleet_memberships` : INSERT, UPDATE, DELETE (SELECT existe déjà)

2. **Crée la fonction `upsert_fleet_membership`** :
   - Gère l'insertion ou la mise à jour de manière **atomique**
   - Utilise `ON CONFLICT` pour éviter les erreurs de contrainte unique
   - Fonctionne même en cas de race condition

3. **Accorde les permissions** nécessaires

### Étape 2 : Le code TypeScript est déjà mis à jour

Le fichier `src/pages/Settings.tsx` utilise maintenant la fonction RPC `upsert_fleet_membership` au lieu d'un INSERT direct.

## 📋 Instructions d'exécution

1. **Ouvrez Supabase SQL Editor**
2. **Copiez-collez** le contenu de `supabase/fix-all-issues-complete.sql`
3. **Exécutez** le script (bouton "Run" ou F5)
4. **Vérifiez** les résultats des requêtes SELECT à la fin du script

## 🧪 Test

Après exécution du script :

1. Allez sur la page **Paramètres**
2. Cliquez sur **"Créer les données ESAMBA-2024"**
3. ✅ Toutes les erreurs devraient être résolues

## 🔍 Comment ça fonctionne

### Avant (problématique)
```typescript
// Vérification puis insertion séparée = race condition possible
const existing = await check();
if (!existing) {
  await insert(); // ❌ Peut échouer si créé entre-temps
}
```

### Après (solution)
```typescript
// UPSERT atomique au niveau base de données
await supabase.rpc("upsert_fleet_membership", {
  p_fleet_id: fleetId,
  p_user_id: user.id,
  p_role: "organizer",
  p_is_active: true,
});
// ✅ Gère automatiquement INSERT ou UPDATE selon l'existence
```

## 🔒 Sécurité

- La fonction utilise `SECURITY DEFINER` pour contourner RLS lors de l'exécution
- Les permissions sont accordées uniquement aux utilisateurs authentifiés
- La contrainte unique est respectée automatiquement

## 📁 Fichiers créés

- ✅ `fix-all-issues-complete.sql` - **Script principal à exécuter** ⭐
- ✅ `upsert-membership-function.sql` - Fonction seule (si besoin)
- ✅ `fix-all-rls-policies.sql` - RLS seul (si besoin)
- ✅ `src/pages/Settings.tsx` - Code TypeScript mis à jour

## ⚠️ Important

**Vous devez exécuter le script SQL dans Supabase** pour que la fonction `upsert_fleet_membership` soit créée. Sans cela, le code TypeScript échouera avec une erreur "function does not exist".
