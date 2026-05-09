-- =====================================================
-- Correction: récursion infinie sur flotte_adhesions
-- La politique memberships_read_manager_org faisait un SELECT sur flotte_adhesions
-- dans son USING, ce qui déclenchait à nouveau les politiques → récursion.
-- On remplace par une politique qui utilise has_role() (SECURITY DEFINER, pas de RLS).
-- =====================================================

DROP POLICY IF EXISTS memberships_read_self ON flotte_adhesions;
DROP POLICY IF EXISTS memberships_read_manager_org ON flotte_adhesions;

-- Une seule politique SELECT : voir ses propres lignes OU être manager/organizer de la flotte
-- has_role() est SECURITY DEFINER et lit flotte_adhesions sans déclencher les politiques.
CREATE POLICY memberships_select_self_or_manager_org ON flotte_adhesions
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR has_role(fleet_id, 'manager')
    OR has_role(fleet_id, 'organizer')
  );
