BEGIN;

-- A demo token mints a real Supabase authentication magic link. Treat it as a
-- one-time credential so a leaked commercial URL cannot mint fresh login links
-- until its original expiration date.
CREATE OR REPLACE FUNCTION public.demo_validate_magic_link(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link record;
BEGIN
  SELECT dml.id, dml.user_id, dml.fleet_id, dml.email,
         dml.expires_at, dml.is_active, dml.used_count
    INTO v_link
    FROM public.demo_magic_links dml
   WHERE dml.token = p_token
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'token_not_found');
  END IF;
  IF NOT v_link.is_active THEN
    RETURN jsonb_build_object('ok', false, 'error', 'token_revoked');
  END IF;
  IF v_link.expires_at <= now() THEN
    UPDATE public.demo_magic_links SET is_active = false WHERE id = v_link.id;
    RETURN jsonb_build_object('ok', false, 'error', 'token_expired');
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.demo_profiles dp
     WHERE dp.user_id = v_link.user_id
       AND dp.is_active = true
       AND (dp.expires_at IS NULL OR dp.expires_at > now())
  ) THEN
    UPDATE public.demo_magic_links SET is_active = false WHERE id = v_link.id;
    RETURN jsonb_build_object('ok', false, 'error', 'account_inactive');
  END IF;

  -- Atomically consume before returning the identity. Concurrent validations
  -- serialize on FOR UPDATE and only the first request succeeds.
  UPDATE public.demo_magic_links
     SET used_count = used_count + 1,
         last_used_at = now(),
         is_active = false
   WHERE id = v_link.id;

  UPDATE public.demo_profiles
     SET last_activity_at = now()
   WHERE user_id = v_link.user_id;

  RETURN jsonb_build_object(
    'ok', true,
    'user_id', v_link.user_id,
    'email', v_link.email,
    'fleet_id', v_link.fleet_id
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.demo_validate_magic_link(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.demo_validate_magic_link(uuid) TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
