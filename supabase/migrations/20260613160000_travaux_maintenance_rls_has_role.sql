-- Aligner RLS maintenance sur has_role (même logique que travaux_lecture_mgr_org_mec)
DROP POLICY IF EXISTS rbac_travaux_read ON public.travaux_maintenance;
CREATE POLICY rbac_travaux_read ON public.travaux_maintenance
  AS RESTRICTIVE
  FOR SELECT
  USING (
    is_platform_admin()
    OR is_app_super_admin()
    OR has_role(fleet_id, 'organizer'::role_type)
    OR has_role(fleet_id, 'manager'::role_type)
    OR has_role(fleet_id, 'mechanic'::role_type)
  );

DROP POLICY IF EXISTS rbac_travaux_write ON public.travaux_maintenance;
CREATE POLICY rbac_travaux_write ON public.travaux_maintenance
  AS RESTRICTIVE
  FOR INSERT
  WITH CHECK (
    is_platform_admin()
    OR is_app_super_admin()
    OR has_role(fleet_id, 'organizer'::role_type)
    OR has_role(fleet_id, 'manager'::role_type)
    OR has_role(fleet_id, 'mechanic'::role_type)
  );

COMMENT ON POLICY rbac_travaux_read ON public.travaux_maintenance IS
  'Lecture travaux : rôles flotte manager/organizer/mechanic ou admin.';
COMMENT ON POLICY rbac_travaux_write ON public.travaux_maintenance IS
  'Création travaux : rôles flotte manager/organizer/mechanic ou admin.';

NOTIFY pgrst, 'reload schema';
