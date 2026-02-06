# 📘 Guide Complet : Création et Intégration de l'Utilisateur Test

## 📋 Vue d'ensemble

Ce guide explique comment créer l'utilisateur `utilisateur_test@example.com` avec le rôle **organizer** dans l'organisation "Test Organisation" et la flotte "Flotte Test".

### Informations de l'utilisateur test

- **Email** : `utilisateur_test@example.com`
- **Rôle** : `organizer` (administrateur de la flotte)
- **Organisation** : "Test Organisation"
- **Flotte** : "Flotte Test"

---

## 🎯 Étapes de Création

### Étape 1 : Créer l'utilisateur dans Supabase Auth

Les utilisateurs doivent être créés dans Supabase Auth avant de pouvoir être intégrés à une organisation. Il existe deux méthodes :

#### Méthode 1 : Via l'interface web Supabase (Recommandé)

1. **Ouvrir Supabase Dashboard**
   - Allez sur https://app.supabase.com
   - Connectez-vous à votre compte
   - Sélectionnez votre projet

2. **Accéder à Authentication**
   - Dans le menu de gauche, cliquez sur **"Authentication"**
   - Cliquez sur l'onglet **"Users"**

3. **Créer un nouvel utilisateur**
   - Cliquez sur le bouton **"Add user"** (en haut à droite)
   - Remplissez le formulaire :
     - **Email** : `utilisateur_test@example.com`
     - **Password** : Choisissez un mot de passe sécurisé (ex: `Test1234!@#$`)
     - **Auto Confirm User** : ✅ Cochez cette case pour confirmer automatiquement l'email
   - Cliquez sur **"Create user"**

4. **Vérifier la création**
   - L'utilisateur devrait apparaître dans la liste des utilisateurs
   - Vérifiez que l'email est `utilisateur_test@example.com`
   - Vérifiez que l'utilisateur est confirmé (colonne "Confirmed")

#### Méthode 2 : Via l'API Supabase Admin (Optionnel)

Si vous préférez utiliser l'API, vous pouvez créer l'utilisateur avec une requête HTTP :

```bash
curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/auth/v1/admin/users' \
  -H "apikey: YOUR_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "utilisateur_test@example.com",
    "password": "Test1234!@#$",
    "email_confirm": true,
    "user_metadata": {
      "full_name": "Utilisateur Test"
    }
  }'
```

**Note** : Remplacez :
- `YOUR_PROJECT_REF` par votre référence de projet Supabase
- `YOUR_SERVICE_ROLE_KEY` par votre clé de service (trouvable dans Settings > API)

---

### Étape 2 : Vérifier que l'organisation et la flotte existent

Avant d'intégrer l'utilisateur, assurez-vous que l'organisation et la flotte existent :

1. **Ouvrir Supabase SQL Editor**
   - Dans Supabase Dashboard, cliquez sur **"SQL Editor"** dans le menu de gauche
   - Créez une nouvelle requête

2. **Vérifier l'organisation**
   ```sql
   SELECT id, name, country_code, created_at
   FROM organisations
   WHERE name = 'Test Organisation';
   ```

3. **Vérifier la flotte**
   ```sql
   SELECT f.id, f.name, f.collection_policy, o.name as organisation
   FROM flottes f
   JOIN organisations o ON o.id = f.org_id
   WHERE f.name = 'Flotte Test' AND o.name = 'Test Organisation';
   ```

4. **Si l'organisation ou la flotte n'existent pas**
   - Exécutez le script `supabase/create-test-account-complete.sql`
   - Ce script crée automatiquement l'organisation et la flotte

---

### Étape 3 : Exécuter le script SQL d'intégration

Une fois l'utilisateur créé dans Supabase Auth, exécutez le script SQL pour l'intégrer à l'organisation :

1. **Ouvrir le script SQL**
   - Ouvrez le fichier `supabase/create-test-user-complete.sql`
   - Copiez tout le contenu (Ctrl+A, Ctrl+C)

2. **Exécuter dans Supabase SQL Editor**
   - Collez le contenu dans Supabase SQL Editor (Ctrl+V)
   - Cliquez sur **"Run"** ou appuyez sur `F5`

3. **Vérifier les messages**
   - Le script affiche des messages de progression :
     ```
     ✅ Organisation "Test Organisation" trouvée : [UUID]
     ✅ Flotte "Flotte Test" trouvée : [UUID]
     ✅ Utilisateur utilisateur_test@example.com trouvé dans auth.users : [UUID]
     ✅ Profil existe déjà pour utilisateur_test@example.com
     ✅ utilisateur_test@example.com ajouté à la flotte "Flotte Test" avec le rôle organizer
     ```

4. **Si l'utilisateur n'existe pas**
   - Le script affichera des instructions pour créer l'utilisateur
   - Suivez les instructions de l'Étape 1 ci-dessus
   - Réexécutez ensuite le script SQL

---

### Étape 4 : Vérifier la création

Pour vérifier que tout a été créé correctement :

1. **Exécuter le script de vérification**
   - Ouvrez le fichier `supabase/verify-test-user.sql`
   - Copiez tout le contenu
   - Collez dans Supabase SQL Editor
   - Exécutez le script

2. **Vérifier les résultats**
   - Tous les éléments doivent être marqués ✅ :
     - ✅ Utilisateur utilisateur_test@example.com existe dans auth.users
     - ✅ Profil existe pour utilisateur_test@example.com
     - ✅ Utilisateur appartient à l'organisation "Test Organisation"
     - ✅ Utilisateur appartient à la flotte "Flotte Test"
     - ✅ Utilisateur a le rôle organizer dans la flotte

3. **Vérification manuelle rapide**
   ```sql
   SELECT 
     u.email,
     p.full_name,
     o.name as organisation,
     f.name as flotte,
     fm.role,
     fm.is_active
   FROM auth.users u
   LEFT JOIN profils p ON p.user_id = u.id
   LEFT JOIN flotte_adhesions fm ON fm.user_id = u.id
   LEFT JOIN flottes f ON f.id = fm.fleet_id
   LEFT JOIN organisations o ON o.id = f.org_id
   WHERE u.email = 'utilisateur_test@example.com';
   ```

---

### Étape 5 : Tester la connexion

Pour tester que l'utilisateur peut se connecter :

1. **Ouvrir l'application**
   - Lancez l'application avec `npm run dev`
   - Ouvrez http://localhost:8080 dans votre navigateur

2. **Se connecter avec l'utilisateur test**
   - Cliquez sur "Se connecter" ou "Login"
   - Email : `utilisateur_test@example.com`
   - Mot de passe : (celui que vous avez défini lors de la création)

3. **Vérifier les permissions**
   - Une fois connecté, allez sur la page **Teams** (`/dashboard/teams`)
   - Vous devriez voir la flotte "Flotte Test"
   - En tant qu'organizer, vous devriez pouvoir :
     - Voir tous les membres de la flotte
     - Ajouter de nouveaux membres
     - Modifier les rôles des membres
     - Gérer la flotte

---

## 🔍 Dépannage

### Problème : L'utilisateur n'existe pas dans auth.users

**Solution** :
1. Vérifiez que vous avez bien créé l'utilisateur dans Supabase Auth (Étape 1)
2. Vérifiez l'orthographe de l'email : `utilisateur_test@example.com`
3. Vérifiez que vous êtes dans le bon projet Supabase

### Problème : Le profil n'existe pas

**Solution** :
1. Le profil devrait être créé automatiquement par le trigger `handle_new_user()`
2. Si le profil n'existe pas, le script SQL le créera automatiquement
3. Vérifiez que le trigger existe :
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
   ```

### Problème : L'utilisateur n'est pas ajouté à la flotte

**Solution** :
1. Vérifiez que l'organisation "Test Organisation" existe
2. Vérifiez que la flotte "Flotte Test" existe
3. Vérifiez que l'utilisateur existe dans `auth.users`
4. Réexécutez le script `create-test-user-complete.sql`

### Problème : Le rôle n'est pas organizer

**Solution** :
1. Vérifiez le rôle dans la table `flotte_adhesions` :
   ```sql
   SELECT fm.role, fm.is_active
   FROM flotte_adhesions fm
   JOIN flottes f ON f.id = fm.fleet_id
   JOIN auth.users u ON u.id = fm.user_id
   WHERE u.email = 'utilisateur_test@example.com'
     AND f.name = 'Flotte Test';
   ```
2. Si le rôle est incorrect, supprimez le membership et réexécutez le script :
   ```sql
   DELETE FROM flotte_adhesions fm
   USING flottes f, auth.users u
   WHERE fm.fleet_id = f.id
     AND fm.user_id = u.id
     AND u.email = 'utilisateur_test@example.com'
     AND f.name = 'Flotte Test';
   ```

### Problème : Erreur de permissions

**Solution** :
1. Vérifiez que vous avez les droits d'administration dans Supabase
2. Vérifiez que les politiques RLS permettent l'insertion dans `flotte_adhesions`
3. Vérifiez que vous êtes authentifié dans Supabase SQL Editor

---

## 📝 Notes Importantes

### Idempotence

Le script `create-test-user-complete.sql` est **idempotent**, ce qui signifie qu'il peut être exécuté plusieurs fois sans erreur. Il vérifie l'existence avant de créer.

### Création automatique du profil

Lorsqu'un utilisateur est créé dans `auth.users`, le trigger `handle_new_user()` crée automatiquement un profil dans la table `profils`. Si le trigger ne fonctionne pas, le script SQL créera le profil manuellement.

### Rôle organizer

Le rôle `organizer` donne les permissions complètes sur la flotte :
- Gérer les membres (ajouter, modifier, supprimer)
- Modifier les rôles
- Gérer les véhicules
- Accéder à toutes les fonctionnalités de la flotte

### Sécurité

- Ne partagez jamais le mot de passe de l'utilisateur test en production
- Utilisez un mot de passe fort même pour les tests
- En production, utilisez des utilisateurs réels avec authentification appropriée

---

## ✅ Checklist de Vérification

Avant de considérer la création comme terminée, vérifiez :

- [ ] L'utilisateur existe dans `auth.users` avec l'email `utilisateur_test@example.com`
- [ ] Le profil existe dans `profils` pour cet utilisateur
- [ ] L'utilisateur appartient à l'organisation "Test Organisation"
- [ ] L'utilisateur appartient à la flotte "Flotte Test"
- [ ] L'utilisateur a le rôle `organizer` dans `flotte_adhesions`
- [ ] Le statut `is_active` est `true`
- [ ] L'utilisateur peut se connecter à l'application
- [ ] L'utilisateur peut accéder à la page Teams
- [ ] L'utilisateur peut voir la flotte "Flotte Test"
- [ ] L'utilisateur peut gérer les membres de la flotte

---

## 📚 Ressources Supplémentaires

- **Script de création** : `supabase/create-test-user-complete.sql`
- **Script de vérification** : `supabase/verify-test-user.sql`
- **Guide de test du compte** : `GUIDE-TEST-ACCOUNT.md`
- **Documentation Supabase Auth** : https://supabase.com/docs/guides/auth

---

## 🆘 Support

Si vous rencontrez des problèmes :

1. Consultez la section Dépannage ci-dessus
2. Vérifiez les logs dans Supabase Dashboard > Logs
3. Exécutez le script de vérification `verify-test-user.sql`
4. Consultez la documentation Supabase

---

**Date de création** : 2025-02-05  
**Dernière mise à jour** : 2025-02-05
