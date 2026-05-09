BEGIN;

-- =====================================================
-- Policies manquantes: listes_verification_maintenance
-- =====================================================
DROP POLICY IF EXISTS listes_verification_lecture_flotte ON public.listes_verification_maintenance;
CREATE POLICY listes_verification_lecture_flotte
ON public.listes_verification_maintenance
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.travaux_maintenance t
    WHERE t.id = listes_verification_maintenance.job_id
      AND (
        public.can_manage_fleet(t.fleet_id)
        OR public.has_role(t.fleet_id, 'mechanic')
      )
  )
);

DROP POLICY IF EXISTS listes_verification_insertion_mec ON public.listes_verification_maintenance;
CREATE POLICY listes_verification_insertion_mec
ON public.listes_verification_maintenance
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.travaux_maintenance t
    WHERE t.id = listes_verification_maintenance.job_id
      AND public.has_role(t.fleet_id, 'mechanic')
  )
);

-- =====================================================
-- Policies manquantes: abonnements
-- =====================================================
DROP POLICY IF EXISTS abonnements_select_manager_org ON public.abonnements;
CREATE POLICY abonnements_select_manager_org
ON public.abonnements
FOR SELECT
TO authenticated
USING (public.can_manage_fleet(fleet_id));

DROP POLICY IF EXISTS abonnements_insert_manager_org ON public.abonnements;
CREATE POLICY abonnements_insert_manager_org
ON public.abonnements
FOR INSERT
TO authenticated
WITH CHECK (public.can_manage_fleet(fleet_id));

DROP POLICY IF EXISTS abonnements_update_manager_org ON public.abonnements;
CREATE POLICY abonnements_update_manager_org
ON public.abonnements
FOR UPDATE
TO authenticated
USING (public.can_manage_fleet(fleet_id))
WITH CHECK (public.can_manage_fleet(fleet_id));

DROP POLICY IF EXISTS abonnements_delete_manager_org ON public.abonnements;
CREATE POLICY abonnements_delete_manager_org
ON public.abonnements
FOR DELETE
TO authenticated
USING (public.can_manage_fleet(fleet_id));

-- =====================================================
-- Policies manquantes: droits_vehicules
-- =====================================================
DROP POLICY IF EXISTS droits_vehicules_select_manager_org ON public.droits_vehicules;
CREATE POLICY droits_vehicules_select_manager_org
ON public.droits_vehicules
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.vehicules v
    WHERE v.id = droits_vehicules.vehicle_id
      AND public.can_manage_fleet(v.fleet_id)
  )
);

DROP POLICY IF EXISTS droits_vehicules_insert_manager_org ON public.droits_vehicules;
CREATE POLICY droits_vehicules_insert_manager_org
ON public.droits_vehicules
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.vehicules v
    WHERE v.id = droits_vehicules.vehicle_id
      AND public.can_manage_fleet(v.fleet_id)
  )
);

DROP POLICY IF EXISTS droits_vehicules_update_manager_org ON public.droits_vehicules;
CREATE POLICY droits_vehicules_update_manager_org
ON public.droits_vehicules
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.vehicules v
    WHERE v.id = droits_vehicules.vehicle_id
      AND public.can_manage_fleet(v.fleet_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.vehicules v
    WHERE v.id = droits_vehicules.vehicle_id
      AND public.can_manage_fleet(v.fleet_id)
  )
);

DROP POLICY IF EXISTS droits_vehicules_delete_manager_org ON public.droits_vehicules;
CREATE POLICY droits_vehicules_delete_manager_org
ON public.droits_vehicules
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.vehicules v
    WHERE v.id = droits_vehicules.vehicle_id
      AND public.can_manage_fleet(v.fleet_id)
  )
);

-- =====================================================
-- Policies manquantes: jetons_qr
-- =====================================================
DROP POLICY IF EXISTS jetons_qr_select_flotte ON public.jetons_qr;
CREATE POLICY jetons_qr_select_flotte
ON public.jetons_qr
FOR SELECT
TO authenticated
USING (
  vehicle_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.vehicules v
    WHERE v.id = jetons_qr.vehicle_id
      AND (
        public.can_manage_fleet(v.fleet_id)
        OR public.has_role(v.fleet_id, 'mechanic')
      )
  )
);

DROP POLICY IF EXISTS jetons_qr_insert_manager_org ON public.jetons_qr;
CREATE POLICY jetons_qr_insert_manager_org
ON public.jetons_qr
FOR INSERT
TO authenticated
WITH CHECK (
  vehicle_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.vehicules v
    WHERE v.id = jetons_qr.vehicle_id
      AND public.can_manage_fleet(v.fleet_id)
  )
);

DROP POLICY IF EXISTS jetons_qr_update_manager_org ON public.jetons_qr;
CREATE POLICY jetons_qr_update_manager_org
ON public.jetons_qr
FOR UPDATE
TO authenticated
USING (
  vehicle_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.vehicules v
    WHERE v.id = jetons_qr.vehicle_id
      AND public.can_manage_fleet(v.fleet_id)
  )
)
WITH CHECK (
  vehicle_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.vehicules v
    WHERE v.id = jetons_qr.vehicle_id
      AND public.can_manage_fleet(v.fleet_id)
  )
);

DROP POLICY IF EXISTS jetons_qr_delete_manager_org ON public.jetons_qr;
CREATE POLICY jetons_qr_delete_manager_org
ON public.jetons_qr
FOR DELETE
TO authenticated
USING (
  vehicle_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.vehicules v
    WHERE v.id = jetons_qr.vehicle_id
      AND public.can_manage_fleet(v.fleet_id)
  )
);

COMMIT;

