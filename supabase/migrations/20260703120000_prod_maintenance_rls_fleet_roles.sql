-- Prod RLS maintenance: no admin/superadmin bypass.
-- Access is granted only through active fleet roles.

ALTER TABLE public.travaux_maintenance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rbac_travaux_read ON public.travaux_maintenance;
DROP POLICY IF EXISTS rbac_travaux_write ON public.travaux_maintenance;
DROP POLICY IF EXISTS rbac_travaux_update ON public.travaux_maintenance;
DROP POLICY IF EXISTS rbac_travaux_delete ON public.travaux_maintenance;

DROP POLICY IF EXISTS travaux_lecture_mgr_org_mec ON public.travaux_maintenance;
DROP POLICY IF EXISTS travaux_insertion_mgr_org_mec ON public.travaux_maintenance;
DROP POLICY IF EXISTS travaux_modification_mgr_org_mec ON public.travaux_maintenance;
DROP POLICY IF EXISTS travaux_suppression_mgr_org ON public.travaux_maintenance;

DROP POLICY IF EXISTS superadmin_all_travaux_maintenance ON public.travaux_maintenance;

CREATE POLICY rbac_travaux_read ON public.travaux_maintenance
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (
    has_role(fleet_id, 'organizer'::role_type)
    OR has_role(fleet_id, 'manager'::role_type)
    OR has_role(fleet_id, 'mechanic'::role_type)
  );

CREATE POLICY travaux_lecture_mgr_org_mec ON public.travaux_maintenance
  FOR SELECT
  TO authenticated
  USING (
    has_role(fleet_id, 'organizer'::role_type)
    OR has_role(fleet_id, 'manager'::role_type)
    OR has_role(fleet_id, 'mechanic'::role_type)
  );

CREATE POLICY rbac_travaux_write ON public.travaux_maintenance
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(fleet_id, 'organizer'::role_type)
    OR has_role(fleet_id, 'manager'::role_type)
    OR has_role(fleet_id, 'mechanic'::role_type)
  );

CREATE POLICY travaux_insertion_mgr_org_mec ON public.travaux_maintenance
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(fleet_id, 'organizer'::role_type)
    OR has_role(fleet_id, 'manager'::role_type)
    OR has_role(fleet_id, 'mechanic'::role_type)
  );

CREATE POLICY rbac_travaux_update ON public.travaux_maintenance
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (
    has_role(fleet_id, 'organizer'::role_type)
    OR has_role(fleet_id, 'manager'::role_type)
    OR has_role(fleet_id, 'mechanic'::role_type)
  )
  WITH CHECK (
    has_role(fleet_id, 'organizer'::role_type)
    OR has_role(fleet_id, 'manager'::role_type)
    OR has_role(fleet_id, 'mechanic'::role_type)
  );

CREATE POLICY travaux_modification_mgr_org_mec ON public.travaux_maintenance
  FOR UPDATE
  TO authenticated
  USING (
    has_role(fleet_id, 'organizer'::role_type)
    OR has_role(fleet_id, 'manager'::role_type)
    OR has_role(fleet_id, 'mechanic'::role_type)
  )
  WITH CHECK (
    has_role(fleet_id, 'organizer'::role_type)
    OR has_role(fleet_id, 'manager'::role_type)
    OR has_role(fleet_id, 'mechanic'::role_type)
  );

CREATE POLICY rbac_travaux_delete ON public.travaux_maintenance
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (
    has_role(fleet_id, 'organizer'::role_type)
    OR has_role(fleet_id, 'manager'::role_type)
  );

CREATE POLICY travaux_suppression_mgr_org ON public.travaux_maintenance
  FOR DELETE
  TO authenticated
  USING (
    has_role(fleet_id, 'organizer'::role_type)
    OR has_role(fleet_id, 'manager'::role_type)
  );

COMMENT ON POLICY rbac_travaux_write ON public.travaux_maintenance IS
  'Prod: creation maintenance via roles flotte uniquement, sans bypass admin.';

NOTIFY pgrst, 'reload schema';
