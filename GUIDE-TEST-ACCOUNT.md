# 📋 Guide Complet : Compte Test avec Membres et Rôles

## 📋 Préambule

Ce guide explique comment créer et tester le compte test "Test Organisation" avec sa flotte "Flotte Test" et plusieurs membres ayant différents rôles.

### Prérequis

Avant de démarrer, vérifiez :

- ✅ L'application tourne (`npm run dev`)
- ✅ Connexion avec un compte utilisateur valide dans Supabase Auth
- ✅ L'utilisateur `test@example.com` existe dans Supabase Auth (créé manuellement si nécessaire)
- ✅ Les fonctions RPC Supabase suivantes sont présentes :
  - `create_esamba_fleet`
  - `upsert_fleet_membership`
  - `add_member_by_email`

---

## 🚀 Étape 1 : Création du Compte Test

### Méthode 1 : Via SQL (Recommandé)

1. **Ouvrir Supabase SQL Editor**
   - Allez sur https://app.supabase.com
   - Sélectionnez votre projet
   - Cliquez sur **"SQL Editor"** dans le menu de gauche

2. **Exécuter le script de création**
   - Ouvrez le fichier `supabase/create-test-account-complete.sql`
   - Copiez tout le contenu
   - Collez-le dans l'éditeur SQL de Supabase
   - Cliquez sur **"Run"** ou appuyez sur `F5`

3. **Vérifier les logs**
   - Le script affiche des messages de progression
   - Vous devriez voir :
     ```
     ✅ Organisation "Test Organisation" créée : [UUID]
     ✅ Flotte "Flotte Test" créée : [UUID]
     ✅ Utilisateur courant ajouté comme organizer
     ✅ test@example.com ajouté comme driver
     ✅ [email] ajouté comme manager
     ✅ [email] ajouté comme mechanic
     ```

### Ce que le script fait

Le script `create-test-account-complete.sql` :

1. **Vérifie les fonctions RPC** nécessaires
2. **Crée ou récupère** l'organisation "Test Organisation" (code pays: CM)
3. **Crée ou récupère** la flotte "Flotte Test" (politique: mix)
4. **Ajoute les membres** avec différents rôles :
   - Utilisateur courant → **organizer** (si authentifié)
   - test@example.com → **driver**
   - Autres utilisateurs disponibles → **manager**, **mechanic**

**Note importante** : Le script est **idempotent**, ce qui signifie qu'il peut être exécuté plusieurs fois sans erreur. Il vérifie l'existence avant de créer.

---

## ✅ Étape 2 : Vérification des Données

### Vérification SQL

1. **Exécuter le script de vérification**
   - Ouvrez `supabase/verify-test-account.sql` dans Supabase SQL Editor
   - Exécutez le script
   - Vérifiez que tous les éléments sont marqués ✅

2. **Vérifications effectuées** :
   - ✅ Organisation "Test Organisation" existe
   - ✅ Flotte "Flotte Test" existe
   - ✅ Fonctions RPC présentes
   - ✅ Membres présents avec leurs rôles
   - ✅ test@example.com est membre avec le rôle driver

### Requêtes SQL de vérification rapide

```sql
-- Vérifier l'organisation et la flotte
SELECT 
  o.name as organisation,
  f.name as flotte,
  COUNT(DISTINCT fm.id) FILTER (WHERE fm.is_active = true) as membres_actifs
FROM orgs o
JOIN fleets f ON f.org_id = o.id
LEFT JOIN fleet_memberships fm ON fm.fleet_id = f.id
WHERE o.name = 'Test Organisation'
GROUP BY o.id, o.name, f.id, f.name;

-- Vérifier les membres avec leurs rôles
SELECT 
  fm.role,
  u.email,
  COALESCE(p.full_name, 'Non défini') as nom_complet,
  fm.is_active
FROM fleet_memberships fm
JOIN fleets f ON f.id = fm.fleet_id
LEFT JOIN auth.users u ON u.id = fm.user_id
LEFT JOIN profiles p ON p.user_id = fm.user_id
WHERE f.name = 'Flotte Test'
ORDER BY 
  CASE fm.role
    WHEN 'organizer' THEN 1
    WHEN 'manager' THEN 2
    WHEN 'driver' THEN 3
    WHEN 'mechanic' THEN 4
  END;
```

---

## 🧪 Étape 3 : Tests via l'Interface Utilisateur

### Test 1 : Visualisation de la Flotte

1. **Accéder à la page Teams**
   - Ouvrez votre navigateur
   - Connectez-vous à l'application
   - Allez sur : `http://localhost:8080/dashboard/teams`

2. **Vérifications attendues** :
   - ✅ La flotte "Flotte Test" apparaît dans la liste
   - ✅ Vous voyez les membres avec leurs rôles
   - ✅ L'utilisateur test@example.com est visible avec le rôle "Chauffeur"
   - ✅ Votre utilisateur est visible avec le rôle "Organisateur"

### Test 2 : Ajout d'un Membre

1. **Préparer la console développeur**
   - Appuyez sur `F12` ou `Ctrl+Shift+I`
   - Allez dans l'onglet "Console"

2. **Ajouter un membre**
   - Sur la page Teams, cliquez sur "Ajouter un membre"
   - Entrez un email d'utilisateur existant (ex: `autre@example.com`)
   - Sélectionnez un rôle (ex: "Chauffeur")
   - Cliquez sur "Ajouter le membre"

3. **Vérifier les logs dans la console** :
   ```javascript
   Tentative d'ajout de membre: { fleetId: "...", email: "autre@example.com", role: "driver" }
   Résultat de add_member_by_email: { membershipId: "...", error: null }
   Membre ajouté avec succès, membershipId: "..."
   ```

4. **Vérifications attendues** :
   - ✅ Toast de succès : "Membre ajouté"
   - ✅ Le nouveau membre apparaît dans la liste
   - ✅ Le rôle est correctement affiché
   - ✅ La date d'ajout est visible

### Test 3 : Modification de Rôle

1. **Modifier le rôle d'un membre**
   - Sur la page Teams, trouvez un membre
   - Cliquez sur le menu "⋯" à côté du membre
   - Sélectionnez "Définir comme..." et choisissez un nouveau rôle

2. **Vérifications attendues** :
   - ✅ Toast de confirmation affiché
   - ✅ Le rôle est mis à jour immédiatement dans la liste
   - ✅ Pas d'erreur dans la console

### Test 4 : Retrait d'un Membre

1. **Retirer un membre**
   - Cliquez sur le menu "⋯" à côté d'un membre
   - Sélectionnez "Retirer de l'équipe"
   - Confirmez l'action

2. **Vérifications attendues** :
   - ✅ Confirmation demandée avant suppression
   - ✅ Toast de confirmation affiché
   - ✅ Le membre disparaît de la liste

---

## 🔍 Étape 4 : Tests Complémentaires

### Test via Script PowerShell

Exécutez le script de test :

```powershell
.\scripts\test-test-account.ps1
```

Le script vous guidera à travers tous les tests et fournira les requêtes SQL nécessaires.

### Vérification des Rôles et Permissions

Vérifiez que les rôles fonctionnent correctement :

- **Organisateur** : Peut ajouter, modifier et retirer des membres
- **Manager** : Peut ajouter et modifier des membres (sauf organizer)
- **Chauffeur** : Ne peut pas gérer les membres
- **Mécanicien** : Ne peut pas gérer les membres

---

## 🐛 Résolution des Problèmes

### Problème : Organisation ou Flotte non créée

**Solution** :
- Vérifiez les logs dans Supabase SQL Editor
- Vérifiez que les fonctions RPC existent
- Exécutez `verify-test-account.sql` pour diagnostiquer

### Problème : Utilisateur test@example.com non trouvé

**Solution** :
- Créez l'utilisateur manuellement dans Supabase Auth
- Ou modifiez le script pour utiliser un autre email existant

### Problème : Membres non visibles dans l'interface

**Solution** :
- Rafraîchissez la page (F5)
- Vérifiez les politiques RLS dans Supabase
- Vérifiez que vous êtes bien connecté avec un compte valide
- Consultez la console du navigateur pour les erreurs

### Problème : Erreur lors de l'ajout d'un membre

**Solution** :
- Vérifiez que l'email existe dans `auth.users`
- Vérifiez que vous avez les permissions (organizer ou manager)
- Vérifiez les logs dans la console du navigateur
- Vérifiez les politiques RLS sur `fleet_memberships`

### Problème : Fonctions RPC manquantes

**Solution** :
- Exécutez les scripts de création des fonctions RPC :
  - `supabase/rpc-create-esamba-fleet.sql`
  - `supabase/upsert-membership-function.sql`
  - `supabase/rpc-add-member-by-email.sql`

---

## 📊 Checklist de Vérification

### Création du Compte Test

- [ ] Script SQL exécuté sans erreur
- [ ] Organisation "Test Organisation" créée
- [ ] Flotte "Flotte Test" créée
- [ ] Utilisateur courant ajouté comme organizer
- [ ] test@example.com ajouté comme driver
- [ ] Autres membres ajoutés avec différents rôles

### Vérification SQL

- [ ] Organisation visible dans `orgs`
- [ ] Flotte visible dans `fleets`
- [ ] Membres visibles dans `fleet_memberships`
- [ ] Rôles correctement assignés
- [ ] test@example.com présent avec rôle driver

### Tests Interface

- [ ] Flotte visible dans la page Teams
- [ ] Membres visibles avec leurs rôles
- [ ] Ajout d'un nouveau membre fonctionne
- [ ] Modification de rôle fonctionne
- [ ] Retrait de membre fonctionne
- [ ] Logs dans la console sont corrects

---

## 📝 Notes Importantes

1. **Idempotence** : Le script `create-test-account-complete.sql` peut être exécuté plusieurs fois sans erreur. Il vérifie l'existence avant de créer.

2. **Utilisateurs requis** : Assurez-vous que `test@example.com` existe dans Supabase Auth avant d'exécuter le script.

3. **Permissions** : Seuls les utilisateurs avec le rôle "organizer" ou "manager" peuvent ajouter des membres.

4. **Politiques RLS** : Les politiques RLS doivent être correctement configurées pour que les membres soient visibles dans l'interface.

---

## 🔗 Fichiers Référencés

- `supabase/create-test-account-complete.sql` - Script principal de création
- `supabase/verify-test-account.sql` - Script de vérification
- `scripts/test-test-account.ps1` - Script PowerShell de test
- `GUIDE-TEST-CREATION-FLOTTE-MEMBRES.md` - Guide de test général

---

**Dernière révision : Février 2025**
