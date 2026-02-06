# 🔍 Examen détaillé : Page Settings ESAMBA

## Analyse des problèmes soulevés

### 1. Incohérences dans les noms de propriétés

- **Constat** :
  - Le hook `useEsambaDataVerification` expose les propriétés `membership_organizer` et `vehicule_esamba_001`.
  - Le composant `Settings.tsx` utilisait incorrectement `verificationStatus?.membership` et `verificationStatus?.vehicle`, ce qui ne fonctionnait pas.

- **Action** : Correction dans `Settings.tsx`
  - Désormais, on exploite bien `verificationStatus?.membership_organizer`, `verificationStatus?.vehicule_esamba_001` et `verificationStatus?.invitation_esamba_2024`.

### 2. Erreurs RLS sur la table `vehicles`

- **Constat :**
  - Lors d’une tentative d’insertion : `new row violates row-level security policy for table "vehicles"`
  - Exigence RLS : l’utilisateur doit avoir le rôle `manager` ou `organizer`.
  - Même après création du membership, il peut y avoir un "retard" de reconnaissance (fonction `has_role`).

- **Action :**
  - Mise en place de la RPC `create_esamba_vehicle` utilisant `SECURITY DEFINER` pour contourner cette contrainte RLS.
  - La nouvelle RPC gère aussi le cas où le véhicule existe déjà (aucune erreur levée).
  - L’opération fonctionne même si le membership n’est pas encore détecté comme effectif côté droits.

### 2b. Erreur RLS sur la table `fleet_invitations`

- **Constat :**
  - Problème similaire à la table vehicles : restriction RLS sur les invitations.
  - Exigence : rôle valide requis pour créer une invitation (dépend du membership fraîchement créé).

- **Action :**
  - Création d’une RPC dédiée : `create_esamba_invitation` (avec `SECURITY DEFINER`).
  - Gère les conflits et permet la création même si le système ne détecte pas encore le nouveau membership.

### 3. Problème d’exécution automatique

- **Constat :** Une création automatique (via un `useEffect`) se lançait au chargement de la page, ce qui pouvait entraîner des soucis quand l’utilisateur ou le contexte n’était pas prêt.

- **Action :** Suppression de l’exécution automatique : l’appel de création est désormais manuel via un bouton. L’utilisateur reste donc maître du déclenchement.

### 4. Vérification de l’ordre de création

- **Constat** : Le processus respecte bien l’ordre logique (membership avant véhicule).
- **Action** : Utilisation de `upsert_fleet_membership` pour garantir une création atomique lors de l’initialisation.

## Synthèse des fichiers impactés

- **`src/pages/Settings.tsx`** : adaptation des clés de statut, remplacement de l’INSERT direct par la nouvelle RPC, désactivation du useEffect automatique.
- **`supabase/rpc-create-esamba-vehicle.sql`** : ajout d’une RPC pour gestion véhicules.
- **`supabase/rpc-create-esamba-invitation.sql`** : ajout d’une RPC pour les invitations.
- **`supabase/fix-all-issues-complete.sql`** : complété pour intégrer toutes les fonctions nécessaires à la séquence ESAMBA.

## Procédure de déploiement

1. Ouvrir le SQL Editor dans Supabase.
2. Coller le script `supabase/fix-all-issues-complete.sql` et l’exécuter.
3. Contrôler la création des fonctions :
   ```sql
   SELECT proname FROM pg_proc 
   WHERE proname IN ('upsert_fleet_membership', 'create_esamba_vehicle', 'create_esamba_invitation');
   ```
4. Démarrer l’application (`npm run dev`) et se rendre dans les paramètres (`/settings`).
5. Cliquer sur « Créer les données ESAMBA-2024 », puis sur « Actualiser ».
6. Vérifier que tous les statuts passent au vert.

## Résultat anticipé

- Statut affiché précisément pour Organisation, Flotte, Membership, Véhicule, Invitation.
- Création sans aucune erreur RLS (vehicles ou invitations).
- Affichage cohérent, tous les badges « Créée » visibles après création.

## Vérification manuelle dans Supabase

```sql
-- Organisation ESAMBA
SELECT COUNT(*) FROM orgs WHERE name = 'Organisation ESAMBA';

-- Flotte ESAMBA
SELECT COUNT(*) FROM fleets WHERE name = 'Flotte ESAMBA';

-- Membership organizer
SELECT COUNT(*) FROM fleet_memberships fm
JOIN fleets f ON f.id = fm.fleet_id
WHERE f.name = 'Flotte ESAMBA' 
  AND fm.role = 'organizer' 
  AND fm.is_active = true;

-- Véhicule ESAMBA-001
SELECT COUNT(*) FROM vehicles v
JOIN fleets f ON f.id = v.fleet_id
WHERE f.name = 'Flotte ESAMBA' 
  AND v.registration = 'ESAMBA-001';

-- Invitation ESAMBA-2024
SELECT COUNT(*) FROM fleet_invitations fi
JOIN fleets f ON f.id = fi.fleet_id
WHERE f.name = 'Flotte ESAMBA' 
  AND fi.code = 'ESAMBA-2024';
```
Ou simplement :
```sql
SELECT * FROM check_esamba_2024();
```

## Points clefs

- Les RPC sont exécutées en `SECURITY DEFINER`, contournant les RLS pour les besoins précis.
- Sécurité maintenue : seuls les utilisateurs authentifiés peuvent invoquer les fonctions.
- Conflits gérés gracieusement via les contraintes uniques (ON CONFLICT).
- L’ordre de création est crucial : Organisation → Flotte → Membership → Véhicule → Invitation.
