BEGIN;

-- authenticated must not need direct SELECT privileges on admin_profiles just to
-- evaluate the flottes RLS policy. Expose only the effective internal role via a
-- SECURITY DEFINER helper and keep active demo identities out of the internal
-- override path.
CREATE OR REPLACE FUNCTION public.get_effective_internal_role(
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.demo_profiles dp
     WHERE dp.user_id = p_user_id
       AND COALESCE(dp.is_active, true) = true
  ) THEN
    RETURN NULL;
  END IF;

  SELECT ap.internal_role
    INTO v_role
    FROM public.admin_profiles ap
   WHERE ap.user_id = p_user_id
     AND ap.is_active = true
   LIMIT 1;

  IF v_role IN ('super_admin', 'admin', 'dev', 'commercial') THEN
    RETURN v_role;
  END IF;

  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_effective_internal_role(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_effective_internal_role(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS flottes_real_universe_isolation ON public.flottes;
CREATE POLICY flottes_real_universe_isolation
ON public.flottes
FOR SELECT
TO authenticated
USING (
  CASE
    WHEN public.get_effective_internal_role() IN ('super_admin', 'admin', 'dev') THEN true
    WHEN public.get_effective_internal_role() = 'commercial' THEN is_demo = true
    WHEN public.is_temporary_user() THEN is_demo = true
    ELSE is_demo = false
      AND EXISTS (
        SELECT 1
          FROM public.flotte_adhesions fa
         WHERE fa.fleet_id = flottes.id
           AND fa.user_id = auth.uid()
           AND fa.is_active = true
      )
  END
);

NOTIFY pgrst, 'reload schema';
COMMIT;
