# Prochaines étapes - Smart Fleet Africa

## ✅ Étape 1 : Vérifier le serveur de développement

### Vérifier que le serveur tourne

1. Ouvrez votre navigateur
2. Allez sur : **http://localhost:8080**
3. Vous devriez voir l'interface de l'application

### Si le serveur ne tourne pas

```bash
npm run dev
```

Le serveur devrait démarrer sur le port **8080**.

---

## 🔧 Étape 2 : Exécuter les fonctions RPC dans Supabase

### 2.1. Fonctions RPC de cohérence (optionnel mais recommandé)

1. Ouvrez votre **Supabase Dashboard** : https://app.supabase.com
2. Sélectionnez votre projet
3. Allez dans **SQL Editor** (menu de gauche)
4. Ouvrez le fichier `supabase/rpc-consistency.sql`
5. **Copiez tout le contenu** et collez-le dans l'éditeur SQL
6. Cliquez sur **Run** ou appuyez sur `Ctrl+Enter`

Ces fonctions permettent de :
- Vérifier les données orphelines
- Vérifier les incohérences logiques
- Nettoyer les données orphelines (avec dry-run)

### 2.2. Fonctions RPC manquantes (OBLIGATOIRE)

1. Dans le même **SQL Editor** de Supabase
2. Ouvrez le fichier `supabase/migrations/20250206000001_rename_rpc_functions_to_french.sql`
3. **Copiez tout le contenu** et collez-le dans l'éditeur SQL
4. Cliquez sur **Run** ou appuyez sur `Ctrl+Enter`

Ces fonctions RPC **françaises** sont **essentielles** pour le bon fonctionnement de l'application :
- ✅ Création de flotte (`creer_flotte_esamba`)
- ✅ Gestion des adhésions de flotte (`creer_ou_mettre_a_jour_adhesion_flotte`)
- ✅ Création des véhicules de démonstration ESAMBA (`creer_vehicule_esamba`)
- ✅ Création des invitations ESAMBA (`creer_invitation_esamba`)
- ✅ Vérification du setup ESAMBA (`verifier_esamba_2024`)
- ✅ Gestion des membres par email (`ajouter_membre_par_email`)
- ✅ Assurance du profil utilisateur (`assurer_profil_utilisateur`)

Sans cette migration, la page **Créer une flotte** (`/dashboard/create-fleet`) et le bouton **Créer les données ESAMBA-2024** dans la page Paramètres échoueront avec des erreurs de type *« function does not exist »*.

### 2.2bis. Politiques RLS sur flotte_adhesions (création de flotte)

Pour que la **création de flotte** aille au bout (affichage de la flotte après redirection), les politiques RLS sur `flotte_adhesions` ne doivent pas provoquer de récursion infinie. Appliquez la migration :

- Fichier : `supabase/migrations/20250206000004_fix_flotte_adhesions_rls_recursion.sql`

Elle remplace les politiques SELECT qui référençaient `flotte_adhesions` dans leur condition par une politique unique utilisant la fonction `has_role()` (SECURITY DEFINER), ce qui évite l’erreur *« infinite recursion detected in policy for relation flotte_adhesions »*.

**Vérification rapide après déploiement** : connectez-vous, allez sur `/dashboard/create-fleet`, créez une organisation et une flotte. Vérifiez le toast de succès, la redirection vers `/dashboard`, et la présence de la flotte (ex. Paramètres > Mon espace organisateur, ou Profil > Mes flottes).

### 2.2ter. Création de flotte – rappel et non-régression

La **création de flotte** (page `/dashboard/create-fleet`) repose sur :

- **RPC en français** : `creer_flotte_esamba` (organisation + flotte) et `creer_ou_mettre_a_jour_adhesion_flotte` (adhésion de l’utilisateur comme organizer). Sans la migration des RPC françaises, l’appel échoue avec « function does not exist ».
- **Politiques RLS sur `flotte_adhesions`** : l’utilisateur doit pouvoir **lire** sa propre ligne d’adhésion après la création. Une politique SELECT qui provoque une récursion infinie (en interrogeant `flotte_adhesions` dans sa condition) bloque l’affichage de la flotte après redirection. La migration qui corrige cela est `20250206000004_fix_flotte_adhesions_rls_recursion.sql`.

**Migrations à appliquer dans l’ordre** (si pas déjà fait) :

1. `supabase/migrations/20250206000001_rename_rpc_functions_to_french.sql` — RPC françaises
2. `supabase/migrations/20250206000004_fix_flotte_adhesions_rls_recursion.sql` — RLS `flotte_adhesions` sans récursion

**Vérification après déploiement** : pour éviter les régressions, exécuter la procédure décrite dans **`VERIFICATION-CREATION-FLOTTE.md`** (procédure manuelle + script SQL `supabase/verify-creation-flotte-non-regression.sql`). Pour des **tests manuels complets** (création simple, répétée, multi-flottes) et la vérification de l’affichage sur toutes les pages concernées (Dashboard, Settings, Teams), suivre **`GUIDE-TEST-E2E-CREATION-FLOTTE.md`**.

### 2.3. Vérifier que les fonctions sont créées

Dans Supabase SQL Editor, exécutez :

```sql
-- Lister toutes les fonctions RPC
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION'
  AND routine_name IN (
    'accept_invitation',
    'check_system_health',
    'repair_orphan_membership',
    'assign_vehicle',
    'close_shift',
    'check_orphaned_data',
    'cleanup_orphaned_data'
)
ORDER BY routine_name;
```

Vous devriez voir toutes les fonctions listées.

---

## 🗄️ Étape 3 : Configurer le stockage Supabase

### 3.1. Créer les buckets Storage

1. Dans Supabase Dashboard, allez dans **Storage** (menu de gauche)
2. Créez les buckets suivants :

#### Bucket `maintenance-evidence`
- **Nom** : `maintenance-evidence`
- **Public** : Non (privé)
- **File size limit** : 10 MB (recommandé)
- **Allowed MIME types** : `image/*, application/pdf`

#### Bucket `avatars` (optionnel)
- **Nom** : `avatars`
- **Public** : Oui (pour afficher les avatars)
- **File size limit** : 5 MB (recommandé)
- **Allowed MIME types** : `image/*`

### 3.2. Configurer les politiques RLS pour Storage

Dans Supabase SQL Editor, exécutez le contenu de `supabase/storage-setup.md` ou créez manuellement les politiques dans l'interface Storage.

---

## 🧪 Étape 4 : Tester les fonctionnalités

### 4.1. Test de connexion Supabase

1. Ouvrez l'application sur http://localhost:8080
2. Ouvrez la **Console du navigateur** (F12)
3. Vérifiez qu'il n'y a pas d'erreurs de connexion Supabase

### 4.2. Test d'authentification

1. Créez un compte ou connectez-vous
2. Vérifiez que la session est bien créée
3. Vérifiez que le profil utilisateur est créé

### 4.3. Test des invitations

1. En tant qu'organizer/manager, créez une invitation
2. Utilisez le code d'invitation pour rejoindre la flotte
3. Vérifiez que la fonction RPC `accept_invitation` fonctionne

### 4.4. Test des véhicules

1. Créez un véhicule
2. Vérifiez qu'il apparaît dans la liste
3. Testez l'affectation à un chauffeur

### 4.5. Test des shifts (journées de travail)

1. En tant que chauffeur, démarrez un shift
2. Vérifiez que le shift est créé avec `assignment_id`
3. Clôturez le shift
4. Vérifiez que la fonction RPC `close_shift` fonctionne

### 4.6. Test de la santé du système

1. En tant qu'organizer/manager, accédez à la page de santé du système
2. Vérifiez que la fonction RPC `check_system_health` fonctionne
3. Testez la réparation d'un membership orphelin si nécessaire

---

## 🔍 Étape 5 : Vérifications finales

### 5.1. Vérifier les logs

Dans la console du navigateur, vérifiez :
- ✅ Pas d'erreurs 401 (non authentifié)
- ✅ Pas d'erreurs 403 (permission refusée)
- ✅ Pas d'erreurs 404 (fonction RPC non trouvée)

### 5.2. Vérifier les données dans Supabase

1. Dans Supabase Dashboard, allez dans **Table Editor**
2. Vérifiez que les données sont bien créées :
   - `orgs` : Au moins une organisation
   - `fleets` : Au moins une flotte
   - `profiles` : Profils utilisateurs
   - `fleet_memberships` : Membres de flotte
   - `vehicles` : Véhicules (si créés)

### 5.3. Tester les fonctions RPC manuellement

Dans Supabase SQL Editor, testez :

```sql
-- Test accept_invitation (nécessite un code d'invitation valide)
SELECT accept_invitation('CODE_INVITATION_ICI');

-- Test check_system_health (nécessite un fleet_id)
SELECT check_system_health('FLEET_ID_ICI');

-- Test repair_orphan_membership (nécessite permissions)
SELECT repair_orphan_membership(
  'USER_ID_ICI',
  'FLEET_ID_ICI',
  'driver'::role_type
);
```

---

## 📋 Checklist finale

- [ ] Serveur de développement accessible sur http://localhost:8080
- [ ] Fonctions RPC `rpc-consistency.sql` exécutées (optionnel)
- [ ] Migration RPC françaises `20250206000001_rename_rpc_functions_to_french.sql` exécutée (OBLIGATOIRE)
- [ ] Migration RLS `20250206000004_fix_flotte_adhesions_rls_recursion.sql` exécutée (création de flotte)
- [ ] Vérification non-régression création de flotte : procédure dans `VERIFICATION-CREATION-FLOTTE.md` et/ou script `supabase/verify-creation-flotte-non-regression.sql`
- [ ] Buckets Storage créés (`maintenance-evidence`, `avatars`)
- [ ] Politiques RLS configurées pour Storage
- [ ] Test d'authentification réussi
- [ ] Test de création de flotte réussi (`/dashboard/create-fleet`, toast + redirection + flotte visible)
- [ ] Test de création de véhicule réussi
- [ ] Test d'affectation véhicule-chauffeur réussi
- [ ] Test de shift (démarrage et clôture) réussi
- [ ] Pas d'erreurs dans la console du navigateur

---

## 🆘 En cas de problème

### Erreur "Function does not exist"
- Vérifiez que vous avez bien exécuté `rpc-missing-functions.sql` dans Supabase

### Erreur "Permission denied"
- Vérifiez les politiques RLS dans Supabase
- Vérifiez que l'utilisateur a les bonnes permissions (role)

### Erreur de connexion Supabase
- Vérifiez que `.env.local` contient les bonnes valeurs
- Vérifiez que les variables commencent par `VITE_`

### "Database error querying schema" (à la connexion)
- Procédure détaillée : [docs/verification-connexion-supabase.md](docs/verification-connexion-supabase.md)
- En bref : réactiver le projet sur app.supabase.com si en pause ; vérifier `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` dans `.env.local` ; appliquer toutes les migrations dans l’ordre

### Erreur "Table does not exist"
- Vérifiez que vous avez exécuté `supabase/schema.sql` dans Supabase

---

## 📚 Documentation utile

- `supabase/RPC-USAGE.md` : Guide d'utilisation des fonctions RPC
- `supabase/storage-setup.md` : Configuration du stockage
- `VERIFICATION-CREATION-FLOTTE.md` : Vérification et non-régression création de flotte (RPC + RLS, procédure manuelle et script SQL)
- `BACKEND-FIXES-SUMMARY.md` : Résumé des corrections apportées
- `BACKEND-CHECK-REPORT.md` : Rapport de vérification du backend

---

**Bon développement ! 🚀**
