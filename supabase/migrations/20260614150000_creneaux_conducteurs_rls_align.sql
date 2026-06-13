-- Alignement RLS creneaux_conducteurs (trajets) — isolation demo + nettoyage doublons.
-- fleet_id résolu via affectations_vehicules.

DROP POLICY IF EXISTS demo_isolation_creneaux ON public.creneaux_conducteurs;
CREATE POLICY demo_isolation_creneaux ON public.creneaux_conducteurs
  AS RESTRICTIVE
  FOR ALL
  USING (
    is_platform_admin()
    OR (
      is_demo_user()
      AND EXISTS (
        SELECT 1
        FROM public.affectations_vehicules av
        JOIN public.flottes f ON f.id = av.fleet_id
        WHERE av.id = creneaux_conducteurs.assignment_id AND f.is_demo = true
      )
    )
    OR (
      NOT is_demo_user()
      AND EXISTS (
        SELECT 1
        FROM public.affectations_vehicules av
        JOIN public.flottes f ON f.id = av.fleet_id
        WHERE av.id = creneaux_conducteurs.assignment_id AND (f.is_demo = false OR f.is_demo IS NULL)
      )
    )
  );

-- Doublons anglais (garder policies françaises + creneaux_select_driver enrichi)
DROP POLICY IF EXISTS creneaux_select_driver ON public.creneaux_conducteurs;
DROP POLICY IF EXISTS creneaux_insert_driver ON public.creneaux_conducteurs;
DROP POLICY IF EXISTS creneaux_update_driver ON public.creneaux_conducteurs;

DROP POLICY IF EXISTS rbac_creneaux_read ON public.creneaux_conducteurs;
CREATE POLICY rbac_creneaux_read ON public.creneaux_conducteurs
  AS RESTRICTIVE
  FOR SELECT
  USING (
    is_platform_admin()
    OR is_app_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.affectations_vehicules av
      WHERE av.id = creneaux_conducteurs.assignment_id
        AND av.driver_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.affectations_vehicules av
      WHERE av.id = creneaux_conducteurs.assignment_id
        AND (
          has_role(av.fleet_id, 'organizer'::role_type)
          OR has_role(av.fleet_id, 'manager'::role_type)
          OR has_role(av.fleet_id, 'mechanic'::role_type)
        )
    )
  );

DROP POLICY IF EXISTS rbac_creneaux_write ON public.creneaux_conducteurs;
CREATE POLICY rbac_creneaux_write ON public.creneaux_conducteurs
  AS RESTRICTIVE
  FOR INSERT
  WITH CHECK (
    is_platform_admin()
    OR is_app_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.affectations_vehicules av
      WHERE av.id = creneaux_conducteurs.assignment_id
        AND av.driver_user_id = auth.uid()
        AND av.is_active = true
    )
  );

DROP POLICY IF EXISTS rbac_creneaux_update ON public.creneaux_conducteurs;
CREATE POLICY rbac_creneaux_update ON public.creneaux_conducteurs
  AS RESTRICTIVE
  FOR UPDATE
  USING (
    is_platform_admin()
    OR is_app_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.affectations_vehicules av
      WHERE av.id = creneaux_conducteurs.assignment_id
        AND av.driver_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.affectations_vehicules av
      WHERE av.id = creneaux_conducteurs.assignment_id
        AND (
          has_role(av.fleet_id, 'organizer'::role_type)
          OR has_role(av.fleet_id, 'manager'::role_type)
        )
    )
  )
  WITH CHECK (
    is_platform_admin()
    OR is_app_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.affectations_vehicules av
      WHERE av.id = creneaux_conducteurs.assignment_id
        AND av.driver_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.affectations_vehicules av
      WHERE av.id = creneaux_conducteurs.assignment_id
        AND (
          has_role(av.fleet_id, 'organizer'::role_type)
          OR has_role(av.fleet_id, 'manager'::role_type)
        )
    )
  );

DROP POLICY IF EXISTS creneaux_lecture_conducteur ON public.creneaux_conducteurs;
CREATE POLICY creneaux_lecture_conducteur ON public.creneaux_conducteurs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.affectations_vehicules av
      WHERE av.id = creneaux_conducteurs.assignment_id
        AND av.driver_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS creneaux_lecture_manager_org ON public.creneaux_conducteurs;
CREATE POLICY creneaux_lecture_manager_org ON public.creneaux_conducteurs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.affectations_vehicules av
      WHERE av.id = creneaux_conducteurs.assignment_id
        AND (
          has_role(av.fleet_id, 'organizer'::role_type)
          OR has_role(av.fleet_id, 'manager'::role_type)
          OR has_role(av.fleet_id, 'mechanic'::role_type)
        )
    )
  );

DROP POLICY IF EXISTS creneaux_insertion_conducteur ON public.creneaux_conducteurs;
CREATE POLICY creneaux_insertion_conducteur ON public.creneaux_conducteurs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.affectations_vehicules av
      WHERE av.id = creneaux_conducteurs.assignment_id
        AND av.driver_user_id = auth.uid()
        AND av.is_active = true
    )
  );

DROP POLICY IF EXISTS creneaux_modification_conducteur ON public.creneaux_conducteurs;
CREATE POLICY creneaux_modification_conducteur ON public.creneaux_conducteurs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.affectations_vehicules av
      WHERE av.id = creneaux_conducteurs.assignment_id
        AND av.driver_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.affectations_vehicules av
      WHERE av.id = creneaux_conducteurs.assignment_id
        AND av.driver_user_id = auth.uid()
    )
  );

COMMENT ON POLICY demo_isolation_creneaux ON public.creneaux_conducteurs IS
  'Isolation demo/prod via fleet_id de l''affectation véhicule.';

NOTIFY pgrst, 'reload schema';
