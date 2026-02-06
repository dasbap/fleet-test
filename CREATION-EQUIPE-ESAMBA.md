# 👥 Création d'une Équipe pour l'Organisation ESAMBA

## 📋 Contexte

Vous avez déjà :
- ✅ Organisation ESAMBA
- ✅ Flotte ESAMBA
- ✅ Vous êtes organisateur de cette flotte
- ✅ Véhicule ESAMBA-001
- ✅ Invitation ESAMBA-2024

Maintenant, vous voulez créer une équipe (ajouter des membres) à votre flotte.

## 🎯 Fonctionnalités créées

### 1. Page Teams complète
**Fichier** : `src/pages/Teams.tsx`

Cette page permet de :
- ✅ Voir tous les membres de la flotte ESAMBA
- ✅ Ajouter des membres à l'équipe par email
- ✅ Gérer les rôles des membres (organizer, manager, driver, mechanic)
- ✅ Retirer des membres de l'équipe
- ✅ Voir les détails de chaque membre (nom, téléphone, date d'ajout)

### 2. Hook useFleetMembers
**Fichier** : `src/hooks/useFleetMembers.ts`

Ce hook fournit :
- `useFleetMembers(fleetId)` : Récupère tous les membres d'une flotte
- `useAddFleetMember()` : Ajoute un membre par email
- `useUpdateMemberRole()` : Met à jour le rôle d'un membre
- `useRemoveFleetMember()` : Retire un membre de l'équipe

### 3. Fonction RPC add_member_by_email
**Fichier** : `supabase/rpc-add-member-by-email.sql`

Cette fonction :
- ✅ Trouve un utilisateur par son email
- ✅ Vérifie les permissions (seuls managers/organizers peuvent ajouter)
- ✅ Ajoute le membre à la flotte
- ✅ Gère les conflits (membre déjà existant)

## 🚀 Instructions d'utilisation

### Étape 1 : Exécuter le script SQL de création d'équipe

**Option A : Script complet (recommandé)**

1. **Ouvrez Supabase SQL Editor**
   - Allez sur https://app.supabase.com
   - Sélectionnez votre projet
   - Cliquez sur "SQL Editor"

2. **Exécutez le script de création d'équipe**
   - Ouvrez le fichier `supabase/create-esamba-team-complete.sql`
   - Copiez-collez tout le contenu dans SQL Editor
   - Cliquez sur "Run" ou appuyez sur F5
   - Le script va :
     - ✅ Vérifier que la Flotte ESAMBA existe
     - ✅ Afficher les membres existants
     - ✅ Créer des membres de test (si utilisateurs existent)
     - ✅ Vérifier les résultats

3. **Vérifier les résultats**
   - Le script affiche un résumé des membres créés
   - Vous pouvez aussi exécuter le script de vérification : `scripts/verify-esamba-team.ps1`

**Option B : Via PowerShell (Windows)**

```powershell
# Exécuter le script PowerShell
.\scripts\create-esamba-team.ps1
```

**Option C : Vérifier les fonctions RPC (si nécessaire)**

Si la fonction `add_member_by_email` n'existe pas encore :

1. **Ouvrez Supabase SQL Editor**
2. **Copiez-collez le contenu de `supabase/fix-all-issues-complete.sql`**
3. **Exécutez le script** (Run ou F5)
4. **Vérifiez que la fonction existe** :
   ```sql
   SELECT proname FROM pg_proc 
   WHERE proname = 'add_member_by_email';
   ```

### Étape 2 : Utiliser la page Teams

1. **Lancez l'application**
   ```bash
   npm run dev
   ```

2. **Allez sur la page Équipes**
   - Ouvrez http://localhost:8080/dashboard/teams
   - Ou cliquez sur "Équipes" dans le menu latéral

3. **Ajouter un membre**
   - Cliquez sur "Ajouter un membre"
   - Entrez l'email de l'utilisateur
   - Sélectionnez le rôle (Organisateur, Manager, Chauffeur, Mécanicien)
   - Cliquez sur "Ajouter le membre"

4. **Gérer les membres**
   - Cliquez sur les trois points (⋯) à côté d'un membre
   - Choisissez "Définir comme..." pour changer le rôle
   - Ou "Retirer de l'équipe" pour retirer un membre

## ✅ Fonctionnalités disponibles

### Pour les Organisateurs et Managers

- ✅ Voir tous les membres de la flotte
- ✅ Ajouter des membres par email
- ✅ Modifier les rôles des membres
- ✅ Retirer des membres de l'équipe

### Pour tous les membres

- ✅ Voir la liste des membres de la flotte
- ✅ Voir son propre rôle et statut

## 📝 Rôles disponibles

1. **Organisateur** (organizer)
   - Accès complet à toutes les fonctionnalités
   - Peut gérer l'équipe, les véhicules, les invitations

2. **Manager** (manager)
   - Peut gérer l'équipe et les véhicules
   - Peut créer des invitations

3. **Chauffeur** (driver)
   - Peut conduire les véhicules assignés
   - Peut créer des incidents

4. **Mécanicien** (mechanic)
   - Peut gérer la maintenance
   - Peut créer des jobs de maintenance

## 🔍 Vérification

### Méthode 1 : Via l'interface

1. **Allez sur la page Teams**
   - Ouvrez http://localhost:8080/dashboard/teams
   - Vérifiez que les membres s'affichent correctement
   - Vérifiez les rôles et statuts

### Méthode 2 : Via SQL

**Requête de vérification complète :**

```sql
-- Résumé des membres
SELECT 
  'RÉSUMÉ' as section,
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
  fm.id AS membership_id,
  u.email AS email,
  p.full_name AS nom_complet,
  p.phone AS telephone,
  fm.role AS role,
  CASE WHEN fm.is_active THEN '✅ Actif' ELSE '❌ Inactif' END AS statut,
  fm.created_at AS inscrit_le
FROM fleet_memberships fm
INNER JOIN fleets f ON f.id = fm.fleet_id
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

### Méthode 3 : Via PowerShell

```powershell
# Exécuter le script de vérification
.\scripts\verify-esamba-team.ps1
```

## 🎯 Prochaines étapes

Une fois l'équipe créée, vous pouvez :
1. Assigner des véhicules aux chauffeurs
2. Créer des invitations pour ajouter plus de membres
3. Gérer les rôles selon les besoins
4. Voir les statistiques de l'équipe dans le tableau de bord
