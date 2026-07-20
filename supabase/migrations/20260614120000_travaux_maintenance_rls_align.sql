-- Audit RLS travaux_maintenance (juin 2026) — alignement prod / migrations
-- Drift corrigé :
--   - demo_isolation_travaux (doublon remplacé par demo_isolation_maintenance)
--   - travaux_lecture_mgr_org_mec (legacy, doublon rbac_travaux_read)
--   - rbac_travaux_update/delete réalignés sur has_role + admins
--   - politiques permissives UPDATE/DELETE (même modèle que travaux_insertion_mgr_org_mec)
--   - superadmin_all_travaux_maintenance codifiée (existait en prod, absente du dépôt)

-- ─── Nettoyage legacy ───────────────────────────────────────────────────────

DROP POLICY IF EXISTS demo_isolation_travaux ON public.travaux_maintenance;
DROP POLICY IF EXISTS travaux_lecture_mgr_org_mec ON public.travaux_maintenance;
DROP POLICY IF EXISTS jobs_read_mgr_org_mech ON public.travaux_maintenance;

-- ─── Super-admin (permissive ALL — déjà en prod) ────────────────────────────

DROP POLICY IF EXISTS superadmin_all_travaux_maintenance ON public.travaux_maintenance;
CREATE POLICY superadmin_all_travaux_maintenance ON public.travaux_maintenance
  FOR ALL
  TO authenticated
  USING (is_app_super_admin())
  WITH CHECK (is_app_super_admin());

COMMENT ON POLICY superadmin_all_travaux_maintenance ON public.travaux_maintenance IS
  'Accès total travaux pour super-admin applicatif (permissive ALL).';

-- ─── UPDATE restrictif aligné has_role ────────────────────────────────────

DROP POLICY IF EXISTS rbac_travaux_update ON public.travaux_maintenance;
CREATE POLICY rbac_travaux_update ON public.travaux_maintenance
  AS RESTRICTIVE
  FOR UPDATE
  USING (
    is_platform_admin()
    OR is_app_super_admin()
    OR has_role(fleet_id, 'organizer'::role_type)
    OR has_role(fleet_id, 'manager'::role_type)
    OR has_role(fleet_id, 'mechanic'::role_type)
  )
  WITH CHECK (
    is_platform_admin()
    OR is_app_super_admin()
    OR has_role(fleet_id, 'organizer'::role_type)
    OR has_role(fleet_id, 'manager'::role_type)
    OR has_role(fleet_id, 'mechanic'::role_type)
  );

COMMENT ON POLICY rbac_travaux_update ON public.travaux_maintenance IS
  'Mise à jour travaux : rôles flotte manager/organizer/mechanic ou admin.';

-- ─── DELETE restrictif aligné has_role (manager+ uniquement) ────────────────

DROP POLICY IF EXISTS rbac_travaux_delete ON public.travaux_maintenance;
CREATE POLICY rbac_travaux_delete ON public.travaux_maintenance
  AS RESTRICTIVE
  FOR DELETE
  USING (
    is_platform_admin()
    OR is_app_super_admin()
    OR has_role(fleet_id, 'organizer'::role_type)
    OR has_role(fleet_id, 'manager'::role_type)
  );

COMMENT ON POLICY rbac_travaux_delete ON public.travaux_maintenance IS
  'Suppression travaux : organisateur/manager ou admin (mécanicien exclu).';

-- ─── Permissive UPDATE (OR requis avec restrictives) ────────────────────────

DROP POLICY IF EXISTS travaux_modification_mgr_org_mec ON public.travaux_maintenance;
CREATE POLICY travaux_modification_mgr_org_mec ON public.travaux_maintenance
  FOR UPDATE
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

COMMENT ON POLICY travaux_modification_mgr_org_mec ON public.travaux_maintenance IS
  'Mise à jour permissive : manager, organisateur ou mécanicien actif sur la flotte.';

-- ─── Permissive DELETE (manager/organizer) ──────────────────────────────────

DROP POLICY IF EXISTS travaux_suppression_mgr_org ON public.travaux_maintenance;
CREATE POLICY travaux_suppression_mgr_org ON public.travaux_maintenance
  FOR DELETE
  USING (
    has_role(fleet_id, 'organizer'::role_type)
    OR has_role(fleet_id, 'manager'::role_type)
  );

COMMENT ON POLICY travaux_suppression_mgr_org ON public.travaux_maintenance IS
  'Suppression permissive : organisateur ou manager actif (mécanicien exclu).';

-- ─── Permissive SELECT (remplace travaux_lecture_mgr_org_mec) ───────────────

DROP POLICY IF EXISTS travaux_lecture_mgr_org_mec ON public.travaux_maintenance;
CREATE POLICY travaux_lecture_mgr_org_mec ON public.travaux_maintenance
  FOR SELECT
  USING (
    has_role(fleet_id, 'organizer'::role_type)
    OR has_role(fleet_id, 'manager'::role_type)
    OR has_role(fleet_id, 'mechanic'::role_type)
  );

COMMENT ON POLICY travaux_lecture_mgr_org_mec ON public.travaux_maintenance IS
  'Lecture permissive : manager, organisateur ou mécanicien (complète rbac_travaux_read restrictive).';

NOTIFY pgrst, 'reload schema';
