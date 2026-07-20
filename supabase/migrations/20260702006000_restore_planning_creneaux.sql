-- Restore planned shift table expected by operations and terrain pages.
-- The historical migration creates this table, but baseline environments can
-- miss it entirely from PostgREST's schema cache.

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  IF to_regclass('public.admin_profiles') IS NULL THEN
    RETURN false;
  END IF;

  EXECUTE
    'SELECT EXISTS (
       SELECT 1
       FROM public.admin_profiles
       WHERE user_id = $1 AND is_active = true
     )'
    INTO v_is_admin
    USING auth.uid();

  RETURN COALESCE(v_is_admin, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.is_platform_admin() FROM anon;

CREATE TABLE IF NOT EXISTS public.planning_creneaux (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_id uuid NOT NULL REFERENCES public.flottes(id) ON DELETE CASCADE,
  driver_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES public.vehicules(id) ON DELETE CASCADE,
  planned_start timestamptz NOT NULL,
  planned_end timestamptz,
  status text NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('draft', 'confirmed', 'started', 'cancelled', 'missed')),
  creneau_id uuid REFERENCES public.creneaux_conducteurs(id) ON DELETE SET NULL,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT planning_creneaux_end_after_start
    CHECK (planned_end IS NULL OR planned_end > planned_start)
);

CREATE INDEX IF NOT EXISTS idx_planning_creneaux_fleet_start
  ON public.planning_creneaux (fleet_id, planned_start DESC);

CREATE INDEX IF NOT EXISTS idx_planning_creneaux_driver_start
  ON public.planning_creneaux (driver_user_id, planned_start DESC);

CREATE INDEX IF NOT EXISTS idx_planning_creneaux_status
  ON public.planning_creneaux (fleet_id, status, planned_start);

CREATE UNIQUE INDEX IF NOT EXISTS creneaux_conducteurs_one_open_per_assignment
  ON public.creneaux_conducteurs (assignment_id)
  WHERE status = 'open';

ALTER TABLE public.planning_creneaux ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS planning_creneaux_select ON public.planning_creneaux;
CREATE POLICY planning_creneaux_select ON public.planning_creneaux
  FOR SELECT TO authenticated
  USING (
    driver_user_id = (SELECT auth.uid())
    OR public.has_role(fleet_id, 'organizer'::public.role_type)
    OR public.has_role(fleet_id, 'manager'::public.role_type)
    OR public.is_platform_admin()
  );

DROP POLICY IF EXISTS planning_creneaux_insert ON public.planning_creneaux;
CREATE POLICY planning_creneaux_insert ON public.planning_creneaux
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(fleet_id, 'organizer'::public.role_type)
    OR public.has_role(fleet_id, 'manager'::public.role_type)
  );

DROP POLICY IF EXISTS planning_creneaux_update_driver ON public.planning_creneaux;
CREATE POLICY planning_creneaux_update_driver ON public.planning_creneaux
  FOR UPDATE TO authenticated
  USING (driver_user_id = (SELECT auth.uid()))
  WITH CHECK (driver_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS planning_creneaux_update_manager ON public.planning_creneaux;
CREATE POLICY planning_creneaux_update_manager ON public.planning_creneaux
  FOR UPDATE TO authenticated
  USING (
    public.has_role(fleet_id, 'organizer'::public.role_type)
    OR public.has_role(fleet_id, 'manager'::public.role_type)
  )
  WITH CHECK (
    public.has_role(fleet_id, 'organizer'::public.role_type)
    OR public.has_role(fleet_id, 'manager'::public.role_type)
  );

DROP POLICY IF EXISTS planning_creneaux_delete ON public.planning_creneaux;
CREATE POLICY planning_creneaux_delete ON public.planning_creneaux
  FOR DELETE TO authenticated
  USING (
    public.has_role(fleet_id, 'organizer'::public.role_type)
    OR public.has_role(fleet_id, 'manager'::public.role_type)
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.planning_creneaux TO authenticated;
REVOKE ALL ON public.planning_creneaux FROM anon;

NOTIFY pgrst, 'reload schema';
