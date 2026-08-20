BEGIN;

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
   WHERE user_id = v_creator_id
     AND is_active = true;

  IF v_creator_role NOT IN ('super_admin', 'admin', 'dev', 'commercial') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_authorized');
  END IF;

  IF p_max_uses < 1 OR p_max_uses > 100
     OR p_access_days < 1 OR p_access_days > 365
     OR p_expires_in_days < 1 OR p_expires_in_days > 365 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_limits');
  END IF;

  IF p_universe = 'internal' AND v_creator_role NOT IN ('super_admin', 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'internal_code_admin_required');
  END IF;

  IF p_universe = 'temporary' AND p_role_target NOT IN ('investor', 'prospect') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_role_for_universe');
  END IF;
  IF p_universe = 'internal' AND p_role_target NOT IN ('commercial', 'dev') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_role_for_universe');
  END IF;
  IF p_universe NOT IN ('temporary', 'internal') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unsupported_universe');
  END IF;

  IF p_fleet_id IS NOT NULL AND p_universe = 'temporary' AND NOT EXISTS (
    SELECT 1
      FROM public.flottes
     WHERE id = p_fleet_id
       AND is_demo = true
  ) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'temporary_code_requires_demo_fleet');
  END IF;

  IF p_fleet_id IS NOT NULL AND p_universe = 'internal' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'internal_code_cannot_bind_fleet');
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
    v_code,
    nullif(trim(coalesce(p_label, '')), ''),
    p_universe,
    p_role_target,
    p_max_uses,
    p_access_days,
    now() + (p_expires_in_days || ' days')::interval,
    p_fleet_id,
    v_creator_id
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

CREATE OR REPLACE FUNCTION public.access_code_revoke(
  p_code_id uuid,
  p_revoker uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_revoker_id uuid;
  v_revoker_role text;
BEGIN
  IF auth.role() = 'service_role' THEN
    v_revoker_id := p_revoker;
  ELSE
    IF auth.uid() IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'not_authenticated');
    END IF;
    IF p_revoker IS NOT NULL AND p_revoker IS DISTINCT FROM auth.uid() THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'identity_mismatch');
    END IF;
    v_revoker_id := auth.uid();
  END IF;

  SELECT internal_role INTO v_revoker_role
    FROM public.admin_profiles
   WHERE user_id = v_revoker_id
     AND is_active = true;

  IF auth.role() <> 'service_role'
     AND v_revoker_role NOT IN ('super_admin', 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_authorized');
  END IF;

  UPDATE public.access_codes
     SET is_active = false
   WHERE id = p_code_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.access_code_create(
  public.access_universe, text, text, integer, integer, integer, uuid, uuid
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.access_code_create(
  public.access_universe, text, text, integer, integer, integer, uuid, uuid
) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.access_code_revoke(uuid, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.access_code_revoke(uuid, uuid)
  TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
