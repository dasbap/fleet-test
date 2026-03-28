# Examen détaillé : page Settings ESAMBA

> **Alignement doc / code (2026)** : ce fichier décrit le correctif historique et les **noms réels** utilisés aujourd’hui côté base (tables en français) et côté client (RPC françaises, `verifier_esamba_2024`). Aucune modification de code n’est requise pour lire ce document.

## Analyse des problèmes soulevés

### 1. Incohérences dans les noms de propriétés

- **Constat** :
  - Le hook `useEsambaDataVerification` expose les propriétés `membership_organizer` et `vehicule_esamba_001`.
  - Anciennement, `Settings.tsx` utilisait incorrectement `verificationStatus?.membership` et `verificationStatus?.vehicle`, ce qui ne fonctionnait pas.

- **État actuel** : correction dans `Settings.tsx`
  - Utilisation de `verificationStatus?.membership_organizer`, `verificationStatus?.vehicule_esamba_001` et `verificationStatus?.invitation_esamba_2024` (et les autres clés du type `EsambaDataVerification`).

### 2. Erreurs RLS sur la table `vehicules`

- **Constat** :
  - Lors d’une tentative d’insertion directe : `new row violates row-level security policy` sur la table des véhicules.
  - Exigence RLS : l’utilisateur doit avoir un rôle adapté (ex. `manager` ou `organizer`).
  - Même après création du membership, il peut y avoir un délai de reconnaissance (ex. via `has_role`).

- **Action (schéma)** :
  - RPC **`SECURITY DEFINER`** pour créer le véhicule sans dépendre uniquement du RLS au moment du seed.
  - **Noms** : les scripts SQL historiques (`supabase/rpc-create-esamba-vehicle.sql`) définissent souvent `create_esamba_vehicle` ; après les migrations du dépôt, la fonction exposée côté app est **`creer_vehicule_esamba`** (voir `20250206000001_rename_rpc_functions_to_french.sql`).
  - La logique gère aussi le cas où le véhicule existe déjà (pas d’erreur inutile).

### 2b. Erreur RLS sur la table `flotte_invitations`

- **Constat** :
  - Problème similaire aux véhicules : restriction RLS sur les invitations.
  - Exigence : rôle valide pour créer une invitation (souvent lié au membership tout juste créé).

- **Action (schéma)** :
  - RPC dédiée en **`SECURITY DEFINER`** : en anglais dans certains scripts (`create_esamba_invitation`), en base alignée avec l’app : **`creer_invitation_esamba`**.
  - Gestion des conflits / idempotence selon la définition SQL.

### 3. Problème d’exécution automatique

- **Constat** : une création automatique (via un `useEffect`) au chargement pouvait se lancer avant que l’utilisateur ou le contexte ne soient prêts.

- **État actuel** : pas de seed automatique au montage ; déclenchement **manuel** via le bouton « Créer les données ESAMBA-2024 » dans `Settings.tsx`.

### 4. Vérification de l’ordre de création

- **Constat** : le processus respecte l’ordre logique (adhésion flotte avant véhicule / invitation si nécessaire).
- **Action** : RPC d’adhésion type **`creer_ou_mettre_a_jour_adhesion_flotte`** (équivalent renommé de l’ancien `upsert_fleet_membership` dans les migrations).

## Synthèse des fichiers impactés

- **`src/pages/Settings.tsx`** : clés de statut alignées avec le hook ; bouton de seed (pas d’auto `useEffect` pour la création).
- **`src/hooks/useSeedEsambaData.ts`** → **`src/services/esamba-setup.service.ts`** → **`src/repositories/esamba-setup.repository.ts`** : appels RPC (`creer_flotte_esamba`, `creer_ou_mettre_a_jour_adhesion_flotte`, `creer_vehicule_esamba`, `creer_invitation_esamba`).
- **`src/hooks/useEsambaDataVerification.ts`** : vérification via RPC **`verifier_esamba_2024`** (remplace l’ancien nom `check_esamba_2024` après renommage migration).
- **`supabase/rpc-create-esamba-vehicle.sql`** / **`supabase/rpc-create-esamba-invitation.sql`** : références anglaises utiles pour lecture historique ; le déploiement final suit les migrations (noms français).
- **`supabase/fix-all-issues-complete.sql`** : script monolithique de secours ; préférer l’historique des **migrations** pour une base à jour.

## Procédure de déploiement

1. Déployer le schéma via les **migrations Supabase** du dépôt (recommandé), ou exécuter un script agrégé en SQL Editor si besoin ponctuel.
2. Contrôler la présence des fonctions utilisées par l’app :
   ```sql
   SELECT proname FROM pg_proc
   WHERE proname IN (
     'creer_flotte_esamba',
     'creer_ou_mettre_a_jour_adhesion_flotte',
     'creer_vehicule_esamba',
     'creer_invitation_esamba',
     'verifier_esamba_2024'
   );
   ```
3. Démarrer l’application (`npm run dev`) et ouvrir les paramètres (`/settings`).
4. Cliquer sur « Créer les données ESAMBA-2024 », puis « Actualiser » sur la carte de vérification.
5. Vérifier que les indicateurs passent au vert.

## Résultat attendu

- Statuts corrects pour Organisation, Flotte, Adhésion organizer, Véhicule, Invitation.
- Création sans erreur RLS bloquante pour le flux seed (via RPC `SECURITY DEFINER`).
- Badges cohérents après création et rafraîchissement.

## Vérification manuelle dans Supabase

Tables **réelles** du schéma métier (noms français) :

```sql
-- Organisation ESAMBA
SELECT COUNT(*) FROM organisations WHERE name = 'Organisation ESAMBA';

-- Flotte ESAMBA
SELECT COUNT(*) FROM flottes WHERE name = 'Flotte ESAMBA';

-- Adhésion organizer
SELECT COUNT(*) FROM flotte_adhesions fa
JOIN flottes f ON f.id = fa.fleet_id
WHERE f.name = 'Flotte ESAMBA'
  AND fa.role = 'organizer'
  AND fa.is_active = true;

-- Véhicule ESAMBA-001
SELECT COUNT(*) FROM vehicules v
JOIN flottes f ON f.id = v.fleet_id
WHERE f.name = 'Flotte ESAMBA'
  AND v.registration = 'ESAMBA-001';

-- Invitation ESAMBA-2024
SELECT COUNT(*) FROM flotte_invitations fi
JOIN flottes f ON f.id = fi.fleet_id
WHERE f.name = 'Flotte ESAMBA'
  AND fi.code = 'ESAMBA-2024';
```

Vérification agrégée (nom RPC actuel) :

```sql
SELECT * FROM verifier_esamba_2024();
```

## Points clés

- Les RPC concernées sont en **`SECURITY DEFINER`** pour les besoins du seed ; le reste du modèle reste protégé par RLS.
- Accès : typiquement rôle **`authenticated`** (selon les `GRANT` des migrations).
- Conflits : gérés dans les fonctions (ex. `ON CONFLICT` / upsert) selon le SQL déployé.
- Ordre logique : Organisation → Flotte → Adhésion → Véhicule → Invitation.
