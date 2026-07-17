-- Optimize hot fleet runtime RLS paths used by dashboard lists.
-- Keeps checks in SECURITY DEFINER helpers to avoid recursive policy expansion.

CREATE OR REPLACE FUNCTION public.fleet_has_active_role(p_fleet_id uuid, p_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.flotte_adhesions fa
    WHERE fa.fleet_id = p_fleet_id
      AND fa.user_id = auth.uid()
      AND fa.is_active = true
      AND fa.role::text = ANY (p_roles)
  );
$function$;

CREATE OR REPLACE FUNCTION public.fleet_can_read(p_fleet_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.flotte_adhesions fa
    WHERE fa.fleet_id = p_fleet_id
      AND fa.user_id = auth.uid()
      AND fa.is_active = true
  )
  OR public.is_platform_admin();
$function$;

CREATE OR REPLACE FUNCTION public.fleet_can_manage(p_fleet_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $function$
  SELECT public.fleet_has_active_role(p_fleet_id, ARRAY['organizer', 'manager'])
      OR public.is_platform_admin();
$function$;

CREATE OR REPLACE FUNCTION public.fleet_can_operate(p_fleet_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $function$
  SELECT public.fleet_has_active_role(p_fleet_id, ARRAY['organizer', 'manager', 'mechanic'])
      OR public.is_platform_admin();
$function$;

CREATE OR REPLACE FUNCTION public.assignment_can_read(p_fleet_id uuid, p_driver_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $function$
  SELECT p_driver_user_id = auth.uid()
      OR public.fleet_can_operate(p_fleet_id);
$function$;

CREATE OR REPLACE FUNCTION public.assignment_can_read_by_id(p_assignment_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.affectations_vehicules av
    WHERE av.id = p_assignment_id
      AND public.assignment_can_read(av.fleet_id, av.driver_user_id)
  );
$function$;

CREATE OR REPLACE FUNCTION public.assignment_can_drive_by_id(p_assignment_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.affectations_vehicules av
    WHERE av.id = p_assignment_id
      AND av.driver_user_id = auth.uid()
      AND av.is_active = true
  );
$function$;

CREATE OR REPLACE FUNCTION public.vehicle_can_read(p_vehicle_id uuid, p_fleet_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $function$
  SELECT public.fleet_can_read(p_fleet_id)
      OR EXISTS (
        SELECT 1
        FROM public.affectations_vehicules av
        WHERE av.vehicle_id = p_vehicle_id
          AND av.driver_user_id = auth.uid()
          AND av.is_active = true
      );
$function$;

CREATE OR REPLACE FUNCTION public.incident_can_read(p_vehicle_id uuid, p_driver_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $function$
  SELECT p_driver_user_id = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.vehicules v
        WHERE v.id = p_vehicle_id
          AND public.fleet_can_operate(v.fleet_id)
      )
      OR EXISTS (
        SELECT 1
        FROM public.affectations_vehicules av
        WHERE av.vehicle_id = p_vehicle_id
          AND av.driver_user_id = auth.uid()
          AND av.is_active = true
      );
$function$;

CREATE OR REPLACE FUNCTION public.incident_can_insert(p_vehicle_id uuid, p_driver_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $function$
  SELECT p_driver_user_id = auth.uid()
     AND EXISTS (
        SELECT 1
        FROM public.affectations_vehicules av
        WHERE av.vehicle_id = p_vehicle_id
          AND av.driver_user_id = auth.uid()
          AND av.is_active = true
      );
$function$;

CREATE OR REPLACE FUNCTION public.incident_fleet_can_operate(p_vehicle_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.vehicules v
    WHERE v.id = p_vehicle_id
      AND public.fleet_can_operate(v.fleet_id)
  );
$function$;

CREATE OR REPLACE FUNCTION public.incident_fleet_can_manage(p_vehicle_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.vehicules v
    WHERE v.id = p_vehicle_id
      AND public.fleet_can_manage(v.fleet_id)
  );
$function$;

REVOKE EXECUTE ON FUNCTION public.fleet_has_active_role(uuid, text[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fleet_can_read(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fleet_can_manage(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fleet_can_operate(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.assignment_can_read(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.assignment_can_read_by_id(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.assignment_can_drive_by_id(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.vehicle_can_read(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.incident_can_read(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.incident_can_insert(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.incident_fleet_can_operate(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.incident_fleet_can_manage(uuid) FROM anon;

GRANT EXECUTE ON FUNCTION public.fleet_has_active_role(uuid, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fleet_can_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fleet_can_manage(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fleet_can_operate(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assignment_can_read(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assignment_can_read_by_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assignment_can_drive_by_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.vehicle_can_read(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.incident_can_read(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.incident_can_insert(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.incident_fleet_can_operate(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.incident_fleet_can_manage(uuid) TO authenticated;

-- Collapse duplicate/legacy policies on the hot path tables.
DROP POLICY IF EXISTS "demo_isolation_vehicules" ON public.vehicules;
DROP POLICY IF EXISTS "rbac_vehicules_delete" ON public.vehicules;
DROP POLICY IF EXISTS "rbac_vehicules_update" ON public.vehicules;
DROP POLICY IF EXISTS "rbac_vehicules_write" ON public.vehicules;
DROP POLICY IF EXISTS "superadmin_all_vehicules" ON public.vehicules;
DROP POLICY IF EXISTS "vehicules_delete_by_fleet" ON public.vehicules;
DROP POLICY IF EXISTS "vehicules_ecriture_manager_org" ON public.vehicules;
DROP POLICY IF EXISTS "vehicules_insert_by_fleet" ON public.vehicules;
DROP POLICY IF EXISTS "vehicules_insert_manager" ON public.vehicules;
DROP POLICY IF EXISTS "vehicules_lecture_conducteur_affecte" ON public.vehicules;
DROP POLICY IF EXISTS "vehicules_lecture_manager_org" ON public.vehicules;
DROP POLICY IF EXISTS "vehicules_modification_manager_org" ON public.vehicules;
DROP POLICY IF EXISTS "vehicules_select_by_fleet" ON public.vehicules;
DROP POLICY IF EXISTS "vehicules_select_member" ON public.vehicules;
DROP POLICY IF EXISTS "vehicules_update_by_fleet" ON public.vehicules;
DROP POLICY IF EXISTS "vehicules_update_manager" ON public.vehicules;
DROP POLICY IF EXISTS "vehicules_select_runtime" ON public.vehicules;
DROP POLICY IF EXISTS "vehicules_insert_manager_runtime" ON public.vehicules;
DROP POLICY IF EXISTS "vehicules_update_operator_runtime" ON public.vehicules;
DROP POLICY IF EXISTS "vehicules_delete_manager_runtime" ON public.vehicules;

CREATE POLICY "vehicules_select_runtime" ON public.vehicules
  FOR SELECT TO authenticated
  USING (public.vehicle_can_read(id, fleet_id));

CREATE POLICY "vehicules_insert_manager_runtime" ON public.vehicules
  FOR INSERT TO authenticated
  WITH CHECK (public.fleet_can_manage(fleet_id));

CREATE POLICY "vehicules_update_operator_runtime" ON public.vehicules
  FOR UPDATE TO authenticated
  USING (public.fleet_can_operate(fleet_id))
  WITH CHECK (public.fleet_can_operate(fleet_id));

CREATE POLICY "vehicules_delete_manager_runtime" ON public.vehicules
  FOR DELETE TO authenticated
  USING (public.fleet_can_manage(fleet_id));

DROP POLICY IF EXISTS "affectations_lecture_conducteur_soi" ON public.affectations_vehicules;
DROP POLICY IF EXISTS "affectations_select_fleet" ON public.affectations_vehicules;
DROP POLICY IF EXISTS "affectations_insert_manager" ON public.affectations_vehicules;
DROP POLICY IF EXISTS "affectations_creation_manager_org" ON public.affectations_vehicules;
DROP POLICY IF EXISTS "affectations_lecture_manager_org" ON public.affectations_vehicules;
DROP POLICY IF EXISTS "superadmin_all_affectations_vehicules" ON public.affectations_vehicules;
DROP POLICY IF EXISTS "affectations_select_runtime" ON public.affectations_vehicules;
DROP POLICY IF EXISTS "affectations_insert_manager_runtime" ON public.affectations_vehicules;
DROP POLICY IF EXISTS "affectations_update_manager_runtime" ON public.affectations_vehicules;
DROP POLICY IF EXISTS "affectations_delete_manager_runtime" ON public.affectations_vehicules;

CREATE POLICY "affectations_select_runtime" ON public.affectations_vehicules
  FOR SELECT TO authenticated
  USING (public.assignment_can_read(fleet_id, driver_user_id));

CREATE POLICY "affectations_insert_manager_runtime" ON public.affectations_vehicules
  FOR INSERT TO authenticated
  WITH CHECK (public.fleet_can_manage(fleet_id));

CREATE POLICY "affectations_update_manager_runtime" ON public.affectations_vehicules
  FOR UPDATE TO authenticated
  USING (public.fleet_can_manage(fleet_id))
  WITH CHECK (public.fleet_can_manage(fleet_id));

CREATE POLICY "affectations_delete_manager_runtime" ON public.affectations_vehicules
  FOR DELETE TO authenticated
  USING (public.fleet_can_manage(fleet_id));

DROP POLICY IF EXISTS "creneaux_lecture_conducteur" ON public.creneaux_conducteurs;
DROP POLICY IF EXISTS "creneaux_insertion_conducteur" ON public.creneaux_conducteurs;
DROP POLICY IF EXISTS "creneaux_select_driver" ON public.creneaux_conducteurs;
DROP POLICY IF EXISTS "creneaux_insert_driver" ON public.creneaux_conducteurs;
DROP POLICY IF EXISTS "creneaux_update_driver" ON public.creneaux_conducteurs;
DROP POLICY IF EXISTS "creneaux_lecture_manager_org" ON public.creneaux_conducteurs;
DROP POLICY IF EXISTS "creneaux_modification_conducteur" ON public.creneaux_conducteurs;
DROP POLICY IF EXISTS "demo_isolation_creneaux" ON public.creneaux_conducteurs;
DROP POLICY IF EXISTS "rbac_creneaux_read" ON public.creneaux_conducteurs;
DROP POLICY IF EXISTS "rbac_creneaux_update" ON public.creneaux_conducteurs;
DROP POLICY IF EXISTS "rbac_creneaux_write" ON public.creneaux_conducteurs;
DROP POLICY IF EXISTS "superadmin_all_creneaux_conducteurs" ON public.creneaux_conducteurs;
DROP POLICY IF EXISTS "creneaux_select_runtime" ON public.creneaux_conducteurs;
DROP POLICY IF EXISTS "creneaux_insert_driver_runtime" ON public.creneaux_conducteurs;
DROP POLICY IF EXISTS "creneaux_update_driver_runtime" ON public.creneaux_conducteurs;

CREATE POLICY "creneaux_select_runtime" ON public.creneaux_conducteurs
  FOR SELECT TO authenticated
  USING (public.assignment_can_read_by_id(assignment_id));

CREATE POLICY "creneaux_insert_driver_runtime" ON public.creneaux_conducteurs
  FOR INSERT TO authenticated
  WITH CHECK (public.assignment_can_drive_by_id(assignment_id));

CREATE POLICY "creneaux_update_driver_runtime" ON public.creneaux_conducteurs
  FOR UPDATE TO authenticated
  USING (public.assignment_can_drive_by_id(assignment_id))
  WITH CHECK (public.assignment_can_drive_by_id(assignment_id));

DROP POLICY IF EXISTS "incidents_select_own" ON public.incidents;
DROP POLICY IF EXISTS "incidents_select_manager" ON public.incidents;
DROP POLICY IF EXISTS "incidents_insert_driver" ON public.incidents;
DROP POLICY IF EXISTS "incidents_insertion_conducteur" ON public.incidents;
DROP POLICY IF EXISTS "incidents_lecture_conducteur" ON public.incidents;
DROP POLICY IF EXISTS "demo_isolation_incidents" ON public.incidents;
DROP POLICY IF EXISTS "incidents_lecture_flotte" ON public.incidents;
DROP POLICY IF EXISTS "incidents_modification_mgr_org_mec" ON public.incidents;
DROP POLICY IF EXISTS "incidents_suppression_mgr_org" ON public.incidents;
DROP POLICY IF EXISTS "rbac_incidents_delete" ON public.incidents;
DROP POLICY IF EXISTS "rbac_incidents_read" ON public.incidents;
DROP POLICY IF EXISTS "rbac_incidents_update" ON public.incidents;
DROP POLICY IF EXISTS "rbac_incidents_write" ON public.incidents;
DROP POLICY IF EXISTS "superadmin_all_incidents" ON public.incidents;
DROP POLICY IF EXISTS "incidents_select_runtime" ON public.incidents;
DROP POLICY IF EXISTS "incidents_insert_driver_runtime" ON public.incidents;
DROP POLICY IF EXISTS "incidents_insert_operator_runtime" ON public.incidents;
DROP POLICY IF EXISTS "incidents_update_operator_runtime" ON public.incidents;
DROP POLICY IF EXISTS "incidents_delete_manager_runtime" ON public.incidents;

CREATE POLICY "incidents_select_runtime" ON public.incidents
  FOR SELECT TO authenticated
  USING (public.incident_can_read(vehicle_id, driver_user_id));

CREATE POLICY "incidents_insert_driver_runtime" ON public.incidents
  FOR INSERT TO authenticated
  WITH CHECK (public.incident_can_insert(vehicle_id, driver_user_id));

CREATE POLICY "incidents_insert_operator_runtime" ON public.incidents
  FOR INSERT TO authenticated
  WITH CHECK (public.incident_fleet_can_operate(vehicle_id));

CREATE POLICY "incidents_update_operator_runtime" ON public.incidents
  FOR UPDATE TO authenticated
  USING (public.incident_fleet_can_operate(vehicle_id))
  WITH CHECK (public.incident_fleet_can_operate(vehicle_id));

CREATE POLICY "incidents_delete_manager_runtime" ON public.incidents
  FOR DELETE TO authenticated
  USING (public.incident_fleet_can_manage(vehicle_id));

CREATE INDEX IF NOT EXISTS idx_vehicules_fleet_created
  ON public.vehicules (fleet_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_incidents_vehicle_created
  ON public.incidents (vehicle_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_incidents_created
  ON public.incidents (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_creneaux_conducteurs_assignment
  ON public.creneaux_conducteurs (assignment_id);

CREATE INDEX IF NOT EXISTS idx_affectations_fleet_driver_active
  ON public.affectations_vehicules (fleet_id, driver_user_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_affectations_vehicle_driver_active
  ON public.affectations_vehicules (vehicle_id, driver_user_id)
  WHERE is_active = true;

NOTIFY pgrst, 'reload schema';
