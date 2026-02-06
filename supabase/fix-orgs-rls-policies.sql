-- =====================================================
-- CORRECTION DES POLITIQUES RLS POUR ORGS ET FLEETS
-- Smart Fleet Africa
-- =====================================================
-- Ce script corrige l'erreur RLS qui bloque la création d'organisations
-- =====================================================

-- =====================================================
-- ÉTAPE 1: Vérification de l'état RLS actuel
-- =====================================================
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_actif
FROM pg_tables
WHERE tablename IN ('orgs', 'fleets')
  AND schemaname = 'public';

-- =====================================================
-- ÉTAPE 2: Activation RLS si nécessaire (sans bloquer)
-- =====================================================
-- Activer RLS sur orgs si ce n'est pas déjà fait
ALTER TABLE orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE fleets ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- ÉTAPE 3: Suppression des anciennes politiques (si elles existent)
-- =====================================================
DROP POLICY IF EXISTS orgs_read_authenticated ON orgs;
DROP POLICY IF EXISTS orgs_insert_authenticated ON orgs;
DROP POLICY IF EXISTS orgs_update_authenticated ON orgs;
DROP POLICY IF EXISTS orgs_delete_authenticated ON orgs;

DROP POLICY IF EXISTS fleets_read_authenticated ON fleets;
DROP POLICY IF EXISTS fleets_insert_authenticated ON fleets;
DROP POLICY IF EXISTS fleets_update_authenticated ON fleets;
DROP POLICY IF EXISTS fleets_delete_authenticated ON fleets;

-- =====================================================
-- ÉTAPE 4: Création des politiques RLS pour ORGS
-- =====================================================
-- Permettre la lecture à tous les utilisateurs authentifiés
CREATE POLICY orgs_read_authenticated ON orgs
  FOR SELECT
  TO authenticated
  USING (true);

-- Permettre la création d'organisations aux utilisateurs authentifiés
-- (nécessaire pour la fonctionnalité de seed ESAMBA)
CREATE POLICY orgs_insert_authenticated ON orgs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Permettre la mise à jour aux utilisateurs authentifiés
-- (pour permettre la modification des organisations)
CREATE POLICY orgs_update_authenticated ON orgs
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Permettre la suppression aux utilisateurs authentifiés
-- (pour permettre la suppression des organisations)
CREATE POLICY orgs_delete_authenticated ON orgs
  FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- ÉTAPE 5: Création des politiques RLS pour FLEETS
-- =====================================================
-- Permettre la lecture à tous les utilisateurs authentifiés
CREATE POLICY fleets_read_authenticated ON fleets
  FOR SELECT
  TO authenticated
  USING (true);

-- Permettre la création de flottes aux utilisateurs authentifiés
-- (nécessaire pour la fonctionnalité de seed ESAMBA)
CREATE POLICY fleets_insert_authenticated ON fleets
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Permettre la mise à jour aux utilisateurs authentifiés
CREATE POLICY fleets_update_authenticated ON fleets
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Permettre la suppression aux utilisateurs authentifiés
CREATE POLICY fleets_delete_authenticated ON fleets
  FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- ÉTAPE 6: Vérification des politiques créées
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
WHERE tablename IN ('orgs', 'fleets')
ORDER BY tablename, policyname;

-- =====================================================
-- NOTES
-- =====================================================
-- Ces politiques permettent à tous les utilisateurs authentifiés de :
-- - Lire toutes les organisations et flottes
-- - Créer de nouvelles organisations et flottes
-- - Modifier les organisations et flottes existantes
-- - Supprimer les organisations et flottes
--
-- Pour une sécurité renforcée en production, vous pouvez :
-- 1. Restreindre la création aux organisateurs uniquement
-- 2. Restreindre la modification/suppression aux propriétaires
-- 3. Ajouter des vérifications basées sur les membreships
