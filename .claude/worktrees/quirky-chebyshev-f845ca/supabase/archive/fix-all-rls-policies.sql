-- =====================================================
-- CORRECTION COMPLÈTE DES POLITIQUES RLS : EXÉCUTEZ CE SCRIPT
-- Smart Fleet Africa
-- =====================================================
-- Fin de la sélection “exécuter”
-- CORRECTION COMPLÈTE DES POLITIQUES RLS
-- Smart Fleet Africa
-- =====================================================
-- Ce script corrige toutes les erreurs RLS pour :
-- - ORGS (Organisations)
-- - FLEETS (Flottes)
-- - FLEET_MEMBERSHIPS (Membres de flotte)
-- =====================================================
-- Exécutez ce script dans Supabase SQL Editor
-- =====================================================

-- =====================================================
-- PARTIE 1: ORGS ET FLEETS
-- =====================================================

-- Vérification de l'état RLS
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_actif
FROM pg_tables
WHERE tablename IN ('orgs', 'fleets')
  AND schemaname = 'public';

-- Activation RLS si nécessaire
ALTER TABLE orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE fleets ENABLE ROW LEVEL SECURITY;

-- Suppression des anciennes politiques
DROP POLICY IF EXISTS orgs_read_authenticated ON orgs;
DROP POLICY IF EXISTS orgs_insert_authenticated ON orgs;
DROP POLICY IF EXISTS orgs_update_authenticated ON orgs;
DROP POLICY IF EXISTS orgs_delete_authenticated ON orgs;

DROP POLICY IF EXISTS fleets_read_authenticated ON fleets;
DROP POLICY IF EXISTS fleets_insert_authenticated ON fleets;
DROP POLICY IF EXISTS fleets_update_authenticated ON fleets;
DROP POLICY IF EXISTS fleets_delete_authenticated ON fleets;

-- Politiques ORGS
CREATE POLICY orgs_read_authenticated ON orgs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY orgs_insert_authenticated ON orgs
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY orgs_update_authenticated ON orgs
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY orgs_delete_authenticated ON orgs
  FOR DELETE TO authenticated USING (true);

-- Politiques FLEETS
CREATE POLICY fleets_read_authenticated ON fleets
  FOR SELECT TO authenticated USING (true);

CREATE POLICY fleets_insert_authenticated ON fleets
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY fleets_update_authenticated ON fleets
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY fleets_delete_authenticated ON fleets
  FOR DELETE TO authenticated USING (true);

-- =====================================================
-- PARTIE 2: FLEET_MEMBERSHIPS
-- =====================================================

-- Vérification de l'état RLS
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_actif
FROM pg_tables
WHERE tablename = 'fleet_memberships'
  AND schemaname = 'public';

-- Suppression des anciennes politiques INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS memberships_insert_authenticated ON fleet_memberships;
DROP POLICY IF EXISTS memberships_insert_self ON fleet_memberships;
DROP POLICY IF EXISTS memberships_update_authenticated ON fleet_memberships;
DROP POLICY IF EXISTS memberships_delete_authenticated ON fleet_memberships;

-- Politiques FLEET_MEMBERSHIPS
-- INSERT: Permet à tous les utilisateurs authentifiés de créer des membreships
-- (nécessaire pour la fonctionnalité de seed ESAMBA)
CREATE POLICY memberships_insert_authenticated ON fleet_memberships
  FOR INSERT TO authenticated WITH CHECK (true);

-- UPDATE: Permet la mise à jour des membreships
CREATE POLICY memberships_update_authenticated ON fleet_memberships
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- DELETE: Permet la suppression des membreships
CREATE POLICY memberships_delete_authenticated ON fleet_memberships
  FOR DELETE TO authenticated USING (true);

-- =====================================================
-- VÉRIFICATION FINALE
-- =====================================================

-- Vérification de toutes les politiques créées
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename IN ('orgs', 'fleets', 'fleet_memberships')
ORDER BY tablename, cmd, policyname;

-- =====================================================
-- RÉSUMÉ
-- =====================================================
-- ✅ ORGS: 4 politiques créées (SELECT, INSERT, UPDATE, DELETE)
-- ✅ FLEETS: 4 politiques créées (SELECT, INSERT, UPDATE, DELETE)
-- ✅ FLEET_MEMBERSHIPS: 3 politiques créées (INSERT, UPDATE, DELETE)
--    + 2 politiques existantes conservées (SELECT)
--
-- Toutes les opérations nécessaires pour le seed ESAMBA sont maintenant autorisées.
