# Guide d'exécution de la migration - Fonction search_users

Ce guide vous explique comment exécuter la migration SQL pour ajouter la fonction RPC `search_users` à votre base de données Supabase.

## 📋 Option 1 : Via le Dashboard Supabase (Recommandé)

### Étape 1 : Accéder au SQL Editor

1. Connectez-vous à [Supabase Dashboard](https://app.supabase.com)
2. Sélectionnez votre projet
3. Dans le menu de gauche, cliquez sur **SQL Editor**

### Étape 2 : Exécuter la migration

1. Cliquez sur **New Query** (ou utilisez l'éditeur existant)
2. Ouvrez le fichier `supabase/migrations/20241201000000_add_search_users_rpc.sql`
3. **Copiez tout le contenu** du fichier
4. **Collez-le** dans l'éditeur SQL de Supabase
5. Cliquez sur **Run** (ou appuyez sur `Ctrl+Enter` / `Cmd+Enter`)

### Étape 3 : Vérifier l'exécution

Vous devriez voir un message de succès indiquant que la fonction a été créée.

## 📋 Option 2 : Via Supabase CLI (Si installé)

Si vous avez installé Supabase CLI, vous pouvez exécuter :

```bash
# Initialiser Supabase (si pas déjà fait)
supabase init

# Lier votre projet (remplacez <ton_project_ref> par votre project ref)
supabase link --project-ref <ton_project_ref>

# Pousser la migration
supabase db push
```

### Trouver votre project_ref

Votre `project_ref` se trouve dans l'URL de votre projet Supabase :
- URL : `https://xxxxx.supabase.co`
- Project ref : `xxxxx` (la partie avant `.supabase.co`)

## ✅ Vérification

Pour vérifier que la fonction a été créée correctement, exécutez cette requête dans le SQL Editor :

```sql
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'search_users';
```

Vous devriez voir une ligne avec :
- `routine_name`: `search_users`
- `routine_type`: `FUNCTION`
- `return_type`: `TABLE`

## 🧪 Test de la fonction

Vous pouvez tester la fonction directement dans le SQL Editor :

```sql
-- Test de recherche (remplacez 'test' par un terme de recherche)
SELECT * FROM search_users('test', 10);
```

**Note** : Cette fonction nécessite une authentification. Pour tester, vous devez être connecté en tant qu'utilisateur authentifié.

## 🔍 Fonctionnalités de la fonction

- ✅ Recherche par email (insensible à la casse)
- ✅ Recherche par nom complet (insensible à la casse)
- ✅ Limite par défaut : 20 résultats
- ✅ Maximum : 100 résultats
- ✅ Priorise les correspondances exactes d'email
- ✅ Sécurisée : nécessite une authentification
- ✅ Permissions : accessible aux utilisateurs authentifiés

## 🚀 Prochaines étapes

Une fois la migration exécutée :

1. ✅ La fonction `search_users` sera disponible dans votre application
2. ✅ Le hook `useSearchUsers` pourra être utilisé dans React
3. ✅ La page Teams pourra rechercher des utilisateurs en temps réel

## ❓ Dépannage

### Erreur : "Permission denied"

- Vérifiez que vous êtes connecté à Supabase
- Vérifiez que vous avez les droits d'administration sur le projet

### Erreur : "Function already exists"

- C'est normal si vous exécutez la migration plusieurs fois
- La fonction sera remplacée (CREATE OR REPLACE)

### La fonction ne retourne pas de résultats

- Vérifiez que vous avez des utilisateurs dans `auth.users`
- Vérifiez que les profils existent dans `public.profiles`
- Testez avec un terme de recherche qui correspond à vos données

## 📝 Notes importantes

- La fonction accède à `auth.users` qui nécessite des privilèges spéciaux
- La fonction utilise `SECURITY DEFINER` pour permettre l'accès aux utilisateurs authentifiés
- Les résultats sont limités pour des raisons de performance
