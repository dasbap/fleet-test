-- =====================================================
-- CORRECTION DES POLITIQUES RLS POUR FLEET_MEMBERSHIPS
-- Smart Fleet Africa
-- =====================================================
-- Ce script corrige l'erreur RLS qui bloque la création de membreships
-- =====================================================

-- =====================================================
-- ÉTAPE 1: Vérification de l'état RLS actuel
-- =====================================================
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_actif
FROM pg_tables
WHERE tablename = 'fleet_memberships'
  AND schemaname = 'public';

-- Vérification des politiques existantes
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'fleet_memberships'
ORDER BY policyname;

-- =====================================================
-- ÉTAPE 2: Suppression des anciennes politiques INSERT/UPDATE/DELETE (si elles existent)
-- =====================================================
DROP POLICY IF EXISTS memberships_insert_authenticated ON fleet_memberships;
DROP POLICY IF EXISTS memberships_insert_self ON fleet_memberships;
DROP POLICY IF EXISTS memberships_update_authenticated ON fleet_memberships;
DROP POLICY IF EXISTS memberships_delete_authenticated ON fleet_memberships;

-- =====================================================
-- ÉTAPE 3: Création des politiques RLS pour FLEET_MEMBERSHIPS
-- =====================================================

-- OPTION 1: Politique permissive pour le développement/seed
-- Permet à tous les utilisateurs authentifiés de créer des membreships
-- (nécessaire pour la fonctionnalité de seed ESAMBA)
CREATE POLICY memberships_insert_authenticated ON fleet_memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- OPTION 2: Politique plus sécurisée (commentée)
-- Permet l'insertion uniquement si l'utilisateur s'insère lui-même
-- ou s'il est déjà manager/organizer de la flotte
-- Décommentez cette option et supprimez l'option 1 pour une sécurité renforcée
/*
CREATE POLICY memberships_insert_self_or_manager ON fleet_memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Permettre si l'utilisateur s'insère lui-même
    user_id = auth.uid()
    -- OU si l'utilisateur est déjà manager/organizer de cette flotte
    OR has_role(fleet_id, 'manager')
    OR has_role(fleet_id, 'organizer')
  );
*/

-- Permettre la mise à jour aux utilisateurs authentifiés
-- (pour permettre la modification des membreships)
CREATE POLICY memberships_update_authenticated ON fleet_memberships
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Permettre la suppression aux utilisateurs authentifiés
-- (pour permettre la suppression des membreships)
CREATE POLICY memberships_delete_authenticated ON fleet_memberships
  FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- ÉTAPE 4: Vérification des politiques créées
-- =====================================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'fleet_memberships'
ORDER BY cmd, policyname;

-- =====================================================
-- NOTES
-- =====================================================
-- Les politiques créées permettent à tous les utilisateurs authentifiés de :
-- - Lire leurs propres membreships (déjà existant)
-- - Lire les membreships si manager/organizer (déjà existant)
-- - Créer de nouveaux membreships (NOUVEAU - nécessaire pour seed ESAMBA)
-- - Modifier les membreships (NOUVEAU)
-- - Supprimer les membreships (NOUVEAU)
--
-- Pour une sécurité renforcée en production, vous pouvez :
-- 1. Utiliser l'option 2 (commentée) qui restreint l'insertion
-- 2. Restreindre la modification/suppression aux managers/organizers uniquement
-- 3. Ajouter des vérifications basées sur les rôles existants
