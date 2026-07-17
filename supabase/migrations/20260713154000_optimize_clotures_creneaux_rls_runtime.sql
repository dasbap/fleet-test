-- Optimize clotures_creneaux runtime reads by avoiding nested RLS expansion
-- through creneaux_conducteurs / affectations_vehicules / flotte_adhesions.

CREATE OR REPLACE FUNCTION public.closure_shift_is_driver(p_shift_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.creneaux_conducteurs cc
    INNER JOIN public.affectations_vehicules av ON av.id = cc.assignment_id
    WHERE cc.id = p_shift_id
      AND av.driver_user_id = auth.uid()
  );
$function$;

CREATE OR REPLACE FUNCTION public.closure_shift_can_manage(p_shift_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.creneaux_conducteurs cc
    INNER JOIN public.affectations_vehicules av ON av.id = cc.assignment_id
    INNER JOIN public.flotte_adhesions fa ON fa.fleet_id = av.fleet_id
    WHERE cc.id = p_shift_id
      AND fa.user_id = auth.uid()
      AND fa.is_active = true
      AND fa.role::text = ANY (ARRAY['organizer', 'manager'])
  )
  OR public.is_platform_admin();
$function$;

CREATE OR REPLACE FUNCTION public.closure_shift_can_read(p_shift_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $function$
  SELECT public.closure_shift_is_driver(p_shift_id)
      OR public.closure_shift_can_manage(p_shift_id);
$function$;

REVOKE EXECUTE ON FUNCTION public.closure_shift_is_driver(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.closure_shift_can_manage(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.closure_shift_can_read(uuid) FROM anon;

GRANT EXECUTE ON FUNCTION public.closure_shift_is_driver(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.closure_shift_can_manage(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.closure_shift_can_read(uuid) TO authenticated;

DROP POLICY IF EXISTS "clotures_insertion_conducteur" ON public.clotures_creneaux;
DROP POLICY IF EXISTS "clotures_modification_manager" ON public.clotures_creneaux;
DROP POLICY IF EXISTS "clotures_insert_driver" ON public.clotures_creneaux;
DROP POLICY IF EXISTS "clotures_select_driver" ON public.clotures_creneaux;
DROP POLICY IF EXISTS "clotures_update_manager" ON public.clotures_creneaux;

CREATE POLICY "clotures_insert_driver" ON public.clotures_creneaux
  FOR INSERT TO authenticated
  WITH CHECK (public.closure_shift_is_driver(shift_id));

CREATE POLICY "clotures_select_driver" ON public.clotures_creneaux
  FOR SELECT TO authenticated
  USING (public.closure_shift_can_read(shift_id));

CREATE POLICY "clotures_update_manager" ON public.clotures_creneaux
  FOR UPDATE TO authenticated
  USING (public.closure_shift_can_manage(shift_id))
  WITH CHECK (public.closure_shift_can_manage(shift_id));

CREATE INDEX IF NOT EXISTS idx_clotures_creneaux_pending_shift_created
  ON public.clotures_creneaux (shift_id, created_at DESC)
  WHERE status = 'pending'::public.closure_status;

CREATE INDEX IF NOT EXISTS idx_clotures_creneaux_status_created
  ON public.clotures_creneaux (status, created_at DESC);

NOTIFY pgrst, 'reload schema';
