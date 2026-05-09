-- =====================================================
-- CORRECTION : Ajout des politiques RLS SELECT pour fleet_memberships
-- Smart Fleet Africa
-- =====================================================
-- Ce script ajoute les politiques de lecture manquantes
-- qui empêchent la récupération des memberships
-- =====================================================

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS memberships_read_self ON fleet_memberships;
DROP POLICY IF EXISTS memberships_read_manager_org ON fleet_memberships;

-- Politique de lecture : les utilisateurs peuvent lire leurs propres memberships
CREATE POLICY memberships_read_self ON fleet_memberships
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Politique de lecture : managers et organizers peuvent lire tous les memberships de leur flotte
CREATE POLICY memberships_read_manager_org ON fleet_memberships
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM fleet_memberships fm
      WHERE fm.fleet_id = fleet_memberships.fleet_id
        AND fm.user_id = auth.uid()
        AND fm.role IN ('manager', 'organizer')
        AND fm.is_active = true
    )
  );

-- Vérification
SELECT 
  'VÉRIFICATION DES POLITIQUES' as etape,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'fleet_memberships'
ORDER BY cmd, policyname;

-- =====================================================
-- TEST : Vérifier que vous pouvez lire vos memberships
-- =====================================================
-- Exécutez cette requête pour vérifier :
--
-- SELECT * FROM fleet_memberships 
-- WHERE user_id = auth.uid() 
--   AND is_active = true;
--
-- Si cette requête retourne des résultats, les politiques fonctionnent !
-- =====================================================
