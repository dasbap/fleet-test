-- Alignement RLS incidents — modèle travaux_maintenance + règles conducteur conservées.
-- incidents n'a pas fleet_id : résolution via vehicules.fleet_id.

-- ─── Isolation demo ─────────────────────────────────────────────────────────

DROP POLICY IF EXISTS demo_isolation_incidents ON public.incidents;
CREATE POLICY demo_isolation_incidents ON public.incidents
  AS RESTRICTIVE
  FOR ALL
  USING (
    is_platform_admin()
    OR (
      is_demo_user()
      AND EXISTS (
        SELECT 1
        FROM public.vehicules v
        JOIN public.flottes f ON f.id = v.fleet_id
        WHERE v.id = incidents.vehicle_id AND f.is_demo = true
      )
    )
    OR (
      NOT is_demo_user()
      AND EXISTS (
        SELECT 1
        FROM public.vehicules v
        JOIN public.flottes f ON f.id = v.fleet_id
        WHERE v.id = incidents.vehicle_id AND (f.is_demo = false OR f.is_demo IS NULL)
      )
    )
  );

-- ─── Super-admin (déjà en prod) ─────────────────────────────────────────────

DROP POLICY IF EXISTS superadmin_all_incidents ON public.incidents;
CREATE POLICY superadmin_all_incidents ON public.incidents
  FOR ALL
  TO authenticated
  USING (is_app_super_admin())
  WITH CHECK (is_app_super_admin());

-- ─── Nettoyage doublons anglais ─────────────────────────────────────────────

DROP POLICY IF EXISTS incidents_select_own ON public.incidents;
DROP POLICY IF EXISTS incidents_select_manager ON public.incidents;
DROP POLICY IF EXISTS incidents_insert_driver ON public.incidents;

-- ─── Restrictives RBAC ──────────────────────────────────────────────────────

DROP POLICY IF EXISTS rbac_incidents_read ON public.incidents;
CREATE POLICY rbac_incidents_read ON public.incidents
  AS RESTRICTIVE
  FOR SELECT
  USING (
    is_platform_admin()
    OR is_app_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.vehicules v
      WHERE v.id = incidents.vehicle_id
        AND (
          has_role(v.fleet_id, 'organizer'::role_type)
          OR has_role(v.fleet_id, 'manager'::role_type)
          OR has_role(v.fleet_id, 'mechanic'::role_type)
        )
    )
    OR driver_user_id = auth.uid()
  );

DROP POLICY IF EXISTS rbac_incidents_write ON public.incidents;
CREATE POLICY rbac_incidents_write ON public.incidents
  AS RESTRICTIVE
  FOR INSERT
  WITH CHECK (
    is_platform_admin()
    OR is_app_super_admin()
    OR (
      driver_user_id = auth.uid()
      AND EXISTS (
        SELECT 1
        FROM public.vehicules v
        JOIN public.affectations_vehicules av
          ON av.vehicle_id = v.id
         AND av.is_active = true
         AND av.driver_user_id = auth.uid()
        WHERE v.id = incidents.vehicle_id
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.vehicules v
      WHERE v.id = incidents.vehicle_id
        AND (
          has_role(v.fleet_id, 'organizer'::role_type)
          OR has_role(v.fleet_id, 'manager'::role_type)
        )
    )
  );

DROP POLICY IF EXISTS rbac_incidents_update ON public.incidents;
CREATE POLICY rbac_incidents_update ON public.incidents
  AS RESTRICTIVE
  FOR UPDATE
  USING (
    is_platform_admin()
    OR is_app_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.vehicules v
      WHERE v.id = incidents.vehicle_id
        AND (
          has_role(v.fleet_id, 'organizer'::role_type)
          OR has_role(v.fleet_id, 'manager'::role_type)
          OR has_role(v.fleet_id, 'mechanic'::role_type)
        )
    )
  )
  WITH CHECK (
    is_platform_admin()
    OR is_app_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.vehicules v
      WHERE v.id = incidents.vehicle_id
        AND (
          has_role(v.fleet_id, 'organizer'::role_type)
          OR has_role(v.fleet_id, 'manager'::role_type)
          OR has_role(v.fleet_id, 'mechanic'::role_type)
        )
    )
  );

DROP POLICY IF EXISTS rbac_incidents_delete ON public.incidents;
CREATE POLICY rbac_incidents_delete ON public.incidents
  AS RESTRICTIVE
  FOR DELETE
  USING (
    is_platform_admin()
    OR is_app_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.vehicules v
      WHERE v.id = incidents.vehicle_id
        AND (
          has_role(v.fleet_id, 'organizer'::role_type)
          OR has_role(v.fleet_id, 'manager'::role_type)
        )
    )
  );

-- ─── Permissives (conducteur + flotte) ──────────────────────────────────────

DROP POLICY IF EXISTS incidents_lecture_conducteur ON public.incidents;
CREATE POLICY incidents_lecture_conducteur ON public.incidents
  FOR SELECT
  USING (
    driver_user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.vehicules v
      JOIN public.affectations_vehicules av
        ON av.vehicle_id = v.id
       AND av.is_active = true
       AND av.driver_user_id = auth.uid()
      WHERE v.id = incidents.vehicle_id
    )
  );

DROP POLICY IF EXISTS incidents_lecture_flotte ON public.incidents;
CREATE POLICY incidents_lecture_flotte ON public.incidents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.vehicules v
      WHERE v.id = incidents.vehicle_id
        AND (
          has_role(v.fleet_id, 'organizer'::role_type)
          OR has_role(v.fleet_id, 'manager'::role_type)
          OR has_role(v.fleet_id, 'mechanic'::role_type)
        )
    )
  );

DROP POLICY IF EXISTS incidents_insertion_conducteur ON public.incidents;
CREATE POLICY incidents_insertion_conducteur ON public.incidents
  FOR INSERT
  WITH CHECK (
    driver_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.vehicules v
      JOIN public.affectations_vehicules av
        ON av.vehicle_id = v.id
       AND av.is_active = true
       AND av.driver_user_id = auth.uid()
      WHERE v.id = incidents.vehicle_id
    )
  );

DROP POLICY IF EXISTS incidents_modification_mgr_org_mec ON public.incidents;
CREATE POLICY incidents_modification_mgr_org_mec ON public.incidents
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.vehicules v
      WHERE v.id = incidents.vehicle_id
        AND (
          has_role(v.fleet_id, 'organizer'::role_type)
          OR has_role(v.fleet_id, 'manager'::role_type)
          OR has_role(v.fleet_id, 'mechanic'::role_type)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.vehicules v
      WHERE v.id = incidents.vehicle_id
        AND (
          has_role(v.fleet_id, 'organizer'::role_type)
          OR has_role(v.fleet_id, 'manager'::role_type)
          OR has_role(v.fleet_id, 'mechanic'::role_type)
        )
    )
  );

DROP POLICY IF EXISTS incidents_suppression_mgr_org ON public.incidents;
CREATE POLICY incidents_suppression_mgr_org ON public.incidents
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.vehicules v
      WHERE v.id = incidents.vehicle_id
        AND (
          has_role(v.fleet_id, 'organizer'::role_type)
          OR has_role(v.fleet_id, 'manager'::role_type)
        )
    )
  );

COMMENT ON POLICY demo_isolation_incidents ON public.incidents IS
  'Isolation demo/prod via fleet_id du véhicule lié.';
COMMENT ON POLICY incidents_insertion_conducteur ON public.incidents IS
  'Conducteur : déclaration incident sur véhicule assigné actif.';

NOTIFY pgrst, 'reload schema';
