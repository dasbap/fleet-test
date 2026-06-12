-- Sans politique permissive INSERT pour manager/organizer/mechanic, seule
-- superadmin_all_travaux_maintenance (permissive ALL) s'applique : les autres
-- rôles échouent même si les politiques restrictives passent (PG : AND restrictives + OR permissives).
CREATE POLICY travaux_insertion_mgr_org_mec ON public.travaux_maintenance
  FOR INSERT
  WITH CHECK (
    has_role(fleet_id, 'organizer'::role_type)
    OR has_role(fleet_id, 'manager'::role_type)
    OR has_role(fleet_id, 'mechanic'::role_type)
  );

COMMENT ON POLICY travaux_insertion_mgr_org_mec ON public.travaux_maintenance IS
  'Insertion permissive : manager, organisateur ou mécanicien actif sur la flotte.';

NOTIFY pgrst, 'reload schema';
