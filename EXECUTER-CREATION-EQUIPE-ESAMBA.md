# 🚀 Exécuter la Création de l'Équipe ESAMBA

## 📋 Vue d'ensemble

Ce guide vous explique comment créer et exécuter le script backend pour créer l'équipe ESAMBA et vérifier les résultats.

## ✅ Fichiers créés

1. **`supabase/create-esamba-team-complete.sql`** - Script SQL complet pour créer l'équipe
2. **`scripts/create-esamba-team.ps1`** - Script PowerShell pour exécuter le script SQL
3. **`scripts/verify-esamba-team.ps1`** - Script PowerShell pour vérifier les résultats

## 🎯 Étapes d'exécution

### Étape 1 : Prérequis

Avant d'exécuter le script, assurez-vous que :

- ✅ L'Organisation ESAMBA existe
- ✅ La Flotte ESAMBA existe
- ✅ Vous êtes connecté à votre projet Supabase
- ✅ Les fonctions RPC sont déployées (`add_member_by_email`, `upsert_fleet_membership`)

### Étape 2 : Exécuter le script SQL

**Option A : Via Supabase Dashboard (Recommandé)**

1. **Ouvrez Supabase Dashboard**
   ```
   https://app.supabase.com
   ```

2. **Sélectionnez votre projet**

3. **Allez dans SQL Editor**
   - Cliquez sur "SQL Editor" dans le menu latéral
   - Cliquez sur "New query"

4. **Ouvrez le fichier SQL**
   - Ouvrez `supabase/create-esamba-team-complete.sql`
   - Copiez tout le contenu (Ctrl+A, Ctrl+C)

5. **Collez et exécutez**
   - Collez le contenu dans SQL Editor (Ctrl+V)
   - Cliquez sur "Run" ou appuyez sur F5
   - Attendez la fin de l'exécution

6. **Vérifiez les résultats**
   - Le script affiche des messages dans la console
   - Vérifiez les résultats des requêtes SELECT

**Option B : Via PowerShell**

```powershell
# Naviguer vers le répertoire du projet
cd C:\Users\cnoah\Documents\GitHub\smart-fleet-africa\smart-fleet-africa

# Exécuter le script PowerShell
.\scripts\create-esamba-team.ps1
```

Le script vous donnera des instructions détaillées.

### Étape 3 : Vérifier les résultats

**Méthode 1 : Via l'interface web**

1. **Lancez l'application**
   ```bash
   npm run dev
   ```

2. **Allez sur la page Teams**
   - Ouvrez http://localhost:8080/dashboard/teams
   - Vérifiez que les membres s'affichent

**Méthode 2 : Via SQL**

Exécutez cette requête dans Supabase SQL Editor :

```sql
-- Résumé des membres
SELECT 
  COUNT(*) as total_membres,
  COUNT(*) FILTER (WHERE fm.role = 'organizer') as organisateurs,
  COUNT(*) FILTER (WHERE fm.role = 'manager') as managers,
  COUNT(*) FILTER (WHERE fm.role = 'driver') as chauffeurs,
  COUNT(*) FILTER (WHERE fm.role = 'mechanic') as mecaniciens,
  COUNT(*) FILTER (WHERE fm.is_active = true) as membres_actifs
FROM fleet_memberships fm
JOIN fleets f ON f.id = fm.fleet_id
WHERE f.name = 'Flotte ESAMBA';

-- Liste détaillée
SELECT 
  fm.role,
  CASE WHEN fm.is_active THEN '✅ Actif' ELSE '❌ Inactif' END as statut,
  COALESCE(p.full_name, 'Non renseigné') as nom,
  COALESCE(u.email, 'Email non disponible') as email,
  TO_CHAR(fm.created_at, 'DD/MM/YYYY') as date_ajout
FROM fleet_memberships fm
JOIN fleets f ON f.id = fm.fleet_id
LEFT JOIN profiles p ON p.user_id = fm.user_id
LEFT JOIN auth.users u ON u.id = fm.user_id
WHERE f.name = 'Flotte ESAMBA'
ORDER BY 
  CASE fm.role
    WHEN 'organizer' THEN 1
    WHEN 'manager' THEN 2
    WHEN 'mechanic' THEN 3
    WHEN 'driver' THEN 4
  END,
  fm.created_at DESC;
```

**Méthode 3 : Via PowerShell**

```powershell
# Exécuter le script de vérification
.\scripts\verify-esamba-team.ps1
```

## 📝 Ce que fait le script SQL

Le script `create-esamba-team-complete.sql` :

1. ✅ **Vérifie que la Flotte ESAMBA existe**
   - Vérifie l'organisation
   - Vérifie la flotte
   - Affiche un message d'erreur si non trouvé

2. ✅ **Affiche les membres existants**
   - Compte les membres actuels
   - Affiche un résumé

3. ✅ **Crée des membres de test** (optionnel)
   - Tente de créer des membres avec des emails de test
   - Utilise `upsert_fleet_membership` pour éviter les conflits
   - Note : Les membres ne seront créés que si les utilisateurs existent

4. ✅ **Vérifie les résultats**
   - Affiche un résumé par rôle
   - Liste tous les membres avec leurs détails
   - Vérifie que les fonctions RPC sont disponibles

5. ✅ **Affiche un résumé final**
   - Total de membres
   - Membres actifs
   - Instructions pour ajouter plus de membres

## ⚠️ Notes importantes

### Ajouter des membres réels

Le script SQL tente de créer des membres avec des emails de test (`manager@example.com`, etc.). Ces membres ne seront créés que si ces utilisateurs existent dans `auth.users`.

**Pour ajouter des membres réels :**

1. **Via l'interface** (recommandé)
   - Allez sur `/dashboard/teams`
   - Cliquez sur "Ajouter un membre"
   - Entrez l'email réel de l'utilisateur
   - Sélectionnez le rôle

2. **Via SQL avec email réel**
   ```sql
   -- Utiliser la fonction RPC add_member_by_email
   SELECT public.add_member_by_email(
     (SELECT id FROM fleets WHERE name = 'Flotte ESAMBA' LIMIT 1),
     'email-reel@example.com',
     'manager'::role_type
   );
   ```

3. **Via SQL avec user_id**
   ```sql
   -- Utiliser upsert_fleet_membership avec user_id
   SELECT public.upsert_fleet_membership(
     (SELECT id FROM fleets WHERE name = 'Flotte ESAMBA' LIMIT 1),
     'user-id-ici'::uuid,
     'driver'::role_type,
     true
   );
   ```

## 🔍 Résolution de problèmes

### Erreur : "Flotte ESAMBA non trouvée"

**Solution :**
1. Vérifiez que la flotte existe :
   ```sql
   SELECT id, name FROM fleets WHERE name = 'Flotte ESAMBA';
   ```
2. Si elle n'existe pas, créez-la d'abord via `/dashboard/create-fleet` ou via SQL

### Erreur : "Fonction add_member_by_email n'existe pas"

**Solution :**
1. Exécutez `supabase/fix-all-issues-complete.sql` pour créer toutes les fonctions RPC
2. Vérifiez que la fonction existe :
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'add_member_by_email';
   ```

### Aucun membre créé

**Causes possibles :**
- Les utilisateurs de test n'existent pas dans `auth.users`
- Les emails utilisés ne correspondent à aucun utilisateur

**Solution :**
- Utilisez l'interface Teams pour ajouter des membres avec des emails réels
- Ou créez d'abord les utilisateurs dans Supabase Auth

## ✅ Checklist de vérification

Après l'exécution du script, vérifiez :

- [ ] Le script s'est exécuté sans erreur
- [ ] La Flotte ESAMBA est trouvée
- [ ] Les fonctions RPC sont disponibles
- [ ] Les membres s'affichent dans `/dashboard/teams`
- [ ] Les rôles sont correctement attribués
- [ ] Les membres actifs sont marqués comme "Actif"

## 🎯 Prochaines étapes

Une fois l'équipe créée :

1. ✅ **Assigner des véhicules aux chauffeurs**
   - Allez sur `/dashboard/vehicles`
   - Assignez des véhicules aux membres avec le rôle "driver"

2. ✅ **Créer des invitations supplémentaires**
   - Allez sur `/dashboard/invitations`
   - Créez des codes d'invitation pour ajouter plus de membres

3. ✅ **Gérer les rôles**
   - Utilisez la page Teams pour modifier les rôles si nécessaire

4. ✅ **Voir les statistiques**
   - Consultez le tableau de bord pour voir les statistiques de l'équipe

---

**Dernière mise à jour :** 2024
