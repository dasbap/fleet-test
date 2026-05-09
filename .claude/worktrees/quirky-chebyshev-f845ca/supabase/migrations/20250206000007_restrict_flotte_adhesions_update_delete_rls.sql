-- =====================================================
-- Restriction RLS flotte_adhesions : UPDATE et DELETE
-- Seuls manager ou organizer de la flotte peuvent modifier/supprimer des adhésions.
-- =====================================================

DROP POLICY IF EXISTS memberships_update_authenticated ON flotte_adhesions;
DROP POLICY IF EXISTS memberships_delete_authenticated ON flotte_adhesions;

-- UPDATE : uniquement manager ou organizer de la flotte concernée
CREATE POLICY memberships_update_manager_org ON flotte_adhesions
  FOR UPDATE TO authenticated
  USING (has_role(fleet_id, 'manager') OR has_role(fleet_id, 'organizer'))
  WITH CHECK (has_role(fleet_id, 'manager') OR has_role(fleet_id, 'organizer'));

-- DELETE : uniquement manager ou organizer de la flotte concernée
CREATE POLICY memberships_delete_manager_org ON flotte_adhesions
  FOR DELETE TO authenticated
  USING (has_role(fleet_id, 'manager') OR has_role(fleet_id, 'organizer'));
