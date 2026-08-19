BEGIN;

-- admin_profiles contains super_admin/admin/dev/commercial. Only the first two
-- are platform administrators. Demo identities are never platform admins even
-- if stale/duplicate admin metadata exists.
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.demo_profiles dp
     WHERE dp.user_id = auth.uid()
       AND COALESCE(dp.is_active, true) = true
  ) THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
      FROM public.admin_profiles ap
     WHERE ap.user_id = auth.uid()
       AND ap.is_active = true
       AND ap.internal_role IN ('super_admin', 'admin')
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.is_platform_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.support_current_user_is_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN true;
  END IF;
  RETURN public.is_platform_admin();
END;
$$;
REVOKE EXECUTE ON FUNCTION public.support_current_user_is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.support_current_user_is_admin() TO authenticated, service_role;

-- Offboarding is a fleet-organizer operation or an actual platform-admin
-- operation. A commercial/dev internal profile is not an admin override.
CREATE OR REPLACE FUNCTION public.offboard_member(
  p_user_id uuid,
  p_fleet_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_fleet_id uuid;
  v_rows_count int;
  v_check jsonb;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Permission refusee : utilisateur non authentifie.';
  END IF;

  v_fleet_id := COALESCE(
    p_fleet_id,
    (
      SELECT fa.fleet_id
        FROM public.flotte_adhesions fa
       WHERE fa.user_id = v_caller_id
         AND fa.is_active = true
       ORDER BY fa.created_at DESC
       LIMIT 1
    )
  );
  IF v_fleet_id IS NULL THEN RAISE EXCEPTION 'Flotte introuvable.'; END IF;
  IF p_user_id = v_caller_id THEN RAISE EXCEPTION 'Auto-offboarding interdit.'; END IF;

  v_check := public.rbac_check_permission('member.remove', v_fleet_id);
  IF NOT COALESCE((v_check->>'allowed')::boolean, false)
     AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Permission refusee : member.remove requis.';
  END IF;

  UPDATE public.flotte_adhesions
     SET is_active = false
   WHERE fleet_id = v_fleet_id
     AND user_id = p_user_id
     AND is_active = true;
  GET DIAGNOSTICS v_rows_count = ROW_COUNT;

  IF v_rows_count > 0 AND to_regclass('public.audit_logs') IS NOT NULL THEN
    INSERT INTO public.audit_logs(actor_id, action, target_id, fleet_id, metadata, created_at)
    VALUES (
      v_caller_id,
      'member.offboarded',
      p_user_id,
      v_fleet_id,
      jsonb_build_object('roles_deactivated', v_rows_count),
      now()
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'fleet_id', v_fleet_id,
    'user_id', p_user_id,
    'roles_deactivated', v_rows_count
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.offboard_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.offboard_member(uuid, uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
