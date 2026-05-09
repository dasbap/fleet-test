BEGIN;

-- Option simple: helper minimal pour les checks de permission de flotte.
CREATE OR REPLACE FUNCTION public.can_manage_fleet(p_fleet_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(p_fleet_id, 'manager')
      OR public.has_role(p_fleet_id, 'organizer');
$$;

-- Option scalable: helper dédié aux checks d'accès sur une affectation.
CREATE OR REPLACE FUNCTION public.can_drive_assignment(p_assignment_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.affectations_vehicules a
    WHERE a.id = p_assignment_id
      AND (
        a.driver_user_id = auth.uid()
        OR public.can_manage_fleet(a.fleet_id)
      )
  );
$$;

-- Vue d'observabilité des accès pour faciliter les audits de sécurité.
CREATE OR REPLACE VIEW public.v_access_matrix AS
SELECT
  fa.user_id,
  fa.fleet_id,
  fa.role,
  fa.is_active,
  (fa.role IN ('manager', 'organizer')) AS can_manage_fleet
FROM public.flotte_adhesions fa;

COMMIT;

