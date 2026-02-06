# 🔎 Examen : Création de la Flotte ESAMBA

## 1. Diagnostic

Après utilisation du bouton **"Créer les données ESAMBA-2024"**, la flotte ESAMBA restait rapportée comme "Absente" lors de la vérification. Ceci signalait un problème d’effectivité lors de la création de la ressource en base.

## 2. Audit des solutions

### a. Fonction RPC dédiée

Une fonction RPC nommée `create_esamba_fleet` a été mise en place afin de :
- contourner les limitations RLS via `SECURITY DEFINER`
- vérifier l'existence préalable de la flotte (évite duplicata)
- renvoyer l’identifiant de la flotte, qu’elle soit existante ou nouvellement créée
- mieux gérer les retours d’erreur
Cette approche s’aligne sur les pratiques appliquées aux créations de véhicules et invitations, assurant cohérence et robustesse.

### b. Refactor TypeScript

Le composant React concerné (`src/pages/Settings.tsx`) s’appuie désormais sur l’appel à la fonction RPC au lieu d’un simple `INSERT` SQL direct. L’appel RPC :
- élimine les erreurs RLS côté client
- s’harmonise avec l’architecture des opérations critiques sur les entités (flotte, véhicule, invitation)
- simplifie la gestion des cas de conflits (existant déjà)

## 3. Fichiers concernés

- **`supabase/rpc-create-esamba-fleet.sql`** : définit la fonction RPC pour créer la flotte
- **`src/pages/Settings.tsx`** : utilise la nouvelle fonction RPC pour la création
- **`supabase/fix-all-issues-complete.sql`** : inclut l’ensemble des correctifs nécessaires

## 4. Procédure de vérification

### a. Déploiement SQL

1. Accédez à Supabase SQL Editor.
2. Exécutez l’intégralité du script `supabase/fix-all-issues-complete.sql`.
3. Confirmez la présence de la fonction :
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'create_esamba_fleet';
   ```

### b. Contrôle côté application

1. Lancez l’application avec `npm run dev`
2. Naviguez vers **Paramètres** (`/settings`)
3. Activez **"Créer les données ESAMBA-2024"**
4. Surveillez la confirmation de succès et effectuez l’actualisation
5. Vérifiez que chaque élément affiche le badge "Créée" (vert)

## 5. Espace de vérification manuelle

Pour contrôler la présence de la flotte ESAMBA dans la base :

```sql
-- Vérifier l'existence de la flotte
SELECT id, name, org_id, collection_policy, created_at
FROM fleets 
WHERE name = 'Flotte ESAMBA';

-- Contrôle global par la fonction de vérification
SELECT * FROM check_esamba_2024();
```

## 6. Points essentiels

- L’utilisation de `SECURITY DEFINER` dans la fonction RPC désactive les blocages RLS pour cette opération
- Seuls les utilisateurs authentifiés disposent du droit d’utiliser la fonction
- L’idempotence est assurée via la vérification d’existence avant insertion
- L’ordre opérationnel adopté : Organisation → Flotte → Membership → Véhicule → Invitation

## 7. Fonctions RPC disponibles à l’examen

Le socle complet des fonctions nécessaires est désormais en place :
1. `upsert_fleet_membership` — Memberships
2. `create_esamba_fleet` — Flottes
3. `create_esamba_vehicle` — Véhicules
4. `create_esamba_invitation` — Invitations
5. `check_esamba_2024` — Contrôle d’existence

L’ensemble des scripts est regroupé dans `supabase/fix-all-issues-complete.sql` pour audit.


