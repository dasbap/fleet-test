BEGIN;

-- Match the application permission matrix:
--   admin/super_admin/dev -> may view all fleets
--   commercial           -> may work with demo/prospect fleets, not customer fleets
--   temporary            -> demo fleets only
--   real                 -> own non-demo fleets only
DROP POLICY IF EXISTS flottes_real_universe_isolation ON public.flottes;
CREATE POLICY flottes_real_universe_isolation
ON public.flottes
FOR SELECT
TO authenticated
USING (
  CASE
    WHEN EXISTS (
      SELECT 1
        FROM public.admin_profiles ap
       WHERE ap.user_id = auth.uid()
         AND ap.is_active = true
         AND ap.internal_role IN ('super_admin', 'admin', 'dev')
    ) THEN true
    WHEN EXISTS (
      SELECT 1
        FROM public.admin_profiles ap
       WHERE ap.user_id = auth.uid()
         AND ap.is_active = true
         AND ap.internal_role = 'commercial'
    ) THEN is_demo = true
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

-- Server-side creation permissions must match canCreateCode() in the client:
-- dev/commercial may create demo/prospect codes; only platform admins may create
-- internal commercial/dev codes.
CREATE OR REPLACE FUNCTION public.access_code_create(
  p_universe public.access_universe DEFAULT 'temporary',
  p_role_target text DEFAULT 'prospect',
  p_label text DEFAULT NULL,
  p_max_uses int DEFAULT 1,
  p_access_days int DEFAULT 7,
  p_expires_in_days int DEFAULT 30,
  p_fleet_id uuid DEFAULT NULL,
  p_creator_id uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator_id uuid;
  v_creator_role text;
  v_code text;
  v_code_id uuid;
BEGIN
  IF auth.role() = 'service_role' THEN
    v_creator_id := p_creator_id;
  ELSE
    IF auth.uid() IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'not_authenticated');
    END IF;
    IF p_creator_id IS NOT NULL AND p_creator_id IS DISTINCT FROM auth.uid() THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'identity_mismatch');
    END IF;
    v_creator_id := auth.uid();
  END IF;

  SELECT internal_role INTO v_creator_role
    FROM public.admin_profiles
   WHERE user_id = v_creator_id AND is_active = true;

  IF v_creator_role NOT IN ('super_admin', 'admin', 'dev', 'commercial') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_authorized');
  END IF;

  IF p_max_uses < 1 OR p_max_uses > 100
     OR p_access_days < 1 OR p_access_days > 365
     OR p_expires_in_days < 1 OR p_expires_in_days > 365 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_limits');
  END IF;

  IF p_universe = 'temporary' THEN
    IF p_role_target NOT IN ('investor', 'prospect') THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'invalid_role_for_universe');
    END IF;
  ELSIF p_universe = 'internal' THEN
    IF v_creator_role NOT IN ('super_admin', 'admin') THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'internal_code_admin_required');
    END IF;
    IF p_role_target NOT IN ('commercial', 'dev') THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'invalid_role_for_universe');
    END IF;
  ELSE
    RETURN jsonb_build_object('ok', false, 'reason', 'unsupported_universe');
  END IF;

  IF p_fleet_id IS NOT NULL AND p_universe = 'temporary' AND NOT EXISTS (
    SELECT 1 FROM public.flottes WHERE id = p_fleet_id AND is_demo = true
  ) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'temporary_code_requires_demo_fleet');
  END IF;

  v_code := public.access_code_generate(
    CASE p_role_target
      WHEN 'investor' THEN 'SAMBA-INV'
      WHEN 'prospect' THEN 'SAMBA-PRO'
      WHEN 'commercial' THEN 'SAMBA-COM'
      WHEN 'dev' THEN 'SAMBA-DEV'
      ELSE 'SAMBA'
    END
  );

  INSERT INTO public.access_codes(
    code, label, universe, role_target, max_uses, access_days,
    expires_at, fleet_id, created_by
  ) VALUES (
    v_code, nullif(trim(coalesce(p_label, '')), ''), p_universe, p_role_target,
    p_max_uses, p_access_days, now() + (p_expires_in_days || ' days')::interval,
    p_fleet_id, v_creator_id
  ) RETURNING id INTO v_code_id;

  RETURN jsonb_build_object(
    'ok', true,
    'code_id', v_code_id,
    'code', v_code,
    'universe', p_universe,
    'role_target', p_role_target,
    'max_uses', p_max_uses,
    'access_days', p_access_days,
    'expires_at', now() + (p_expires_in_days || ' days')::interval
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.access_code_create(public.access_universe, text, text, integer, integer, integer, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.access_code_create(public.access_universe, text, text, integer, integer, integer, uuid, uuid) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
