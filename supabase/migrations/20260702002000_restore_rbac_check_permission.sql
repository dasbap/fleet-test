-- Restore the RBAC permission RPC expected by the frontend and team RPCs.
-- This is intentionally narrower than 20260517000002_rbac_complete.sql: it only
-- recreates public.rbac_check_permission(text, uuid) for environments where the
-- function is missing from PostgREST's schema cache.

CREATE OR REPLACE FUNCTION public.rbac_check_permission(
  p_action text,
  p_fleet_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_allowed boolean := false;
  v_is_admin boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'role', null, 'reason', 'session_expired');
  END IF;

  IF to_regclass('public.admin_profiles') IS NOT NULL THEN
    EXECUTE
      'SELECT EXISTS (
         SELECT 1
         FROM public.admin_profiles
         WHERE user_id = $1 AND is_active = true
       )'
      INTO v_is_admin
      USING auth.uid();
  END IF;

  IF v_is_admin THEN
    RETURN jsonb_build_object('allowed', true, 'role', 'admin', 'reason', 'platform_admin');
  END IF;

  IF p_fleet_id IS NOT NULL THEN
    SELECT role::text
    INTO v_role
    FROM public.flotte_adhesions
    WHERE user_id = auth.uid()
      AND fleet_id = p_fleet_id
      AND is_active = true
    ORDER BY created_at DESC
    LIMIT 1;
  ELSE
    SELECT role::text
    INTO v_role
    FROM public.flotte_adhesions
    WHERE user_id = auth.uid()
      AND is_active = true
    ORDER BY CASE role::text
      WHEN 'organizer' THEN 1
      WHEN 'manager' THEN 2
      WHEN 'mechanic' THEN 3
      WHEN 'driver' THEN 4
      ELSE 5
    END
    LIMIT 1;
  END IF;

  IF v_role IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'role', null, 'reason', 'no_fleet_access');
  END IF;

  v_allowed := CASE
    WHEN p_action = 'fleet.view' THEN v_role IN ('organizer', 'manager', 'driver', 'mechanic')
    WHEN p_action = 'fleet.create' THEN v_role = 'organizer'
    WHEN p_action = 'fleet.update' THEN v_role IN ('organizer', 'manager')
    WHEN p_action = 'fleet.delete' THEN v_role = 'organizer'

    WHEN p_action = 'vehicle.view' THEN v_role IN ('organizer', 'manager', 'driver', 'mechanic')
    WHEN p_action = 'vehicle.create' THEN v_role IN ('organizer', 'manager')
    WHEN p_action = 'vehicle.update' THEN v_role IN ('organizer', 'manager', 'mechanic')
    WHEN p_action = 'vehicle.delete' THEN v_role IN ('organizer', 'manager')
    WHEN p_action = 'vehicle.assign_driver' THEN v_role IN ('organizer', 'manager')

    WHEN p_action = 'member.view' THEN v_role IN ('organizer', 'manager', 'mechanic', 'driver')
    WHEN p_action = 'member.invite' THEN v_role IN ('organizer', 'manager')
    WHEN p_action = 'member.remove' THEN v_role = 'organizer'
    WHEN p_action = 'member.update_role' THEN v_role = 'organizer'

    WHEN p_action = 'maintenance.view' THEN v_role IN ('organizer', 'manager', 'mechanic')
    WHEN p_action = 'maintenance.create' THEN v_role IN ('organizer', 'manager', 'mechanic')
    WHEN p_action = 'maintenance.update' THEN v_role IN ('organizer', 'manager', 'mechanic')
    WHEN p_action = 'maintenance.delete' THEN v_role IN ('organizer', 'manager')

    WHEN p_action = 'assignment.view_own' THEN v_role IN ('organizer', 'manager', 'driver', 'mechanic')
    WHEN p_action = 'assignment.view_all' THEN v_role IN ('organizer', 'manager')
    WHEN p_action = 'assignment.manage' THEN v_role IN ('organizer', 'manager')

    WHEN p_action = 'report.view' THEN v_role IN ('organizer', 'manager', 'mechanic')
    WHEN p_action = 'report.export' THEN v_role IN ('organizer', 'manager')

    WHEN p_action = 'billing.view' THEN v_role = 'organizer'
    WHEN p_action = 'billing.manage' THEN v_role = 'organizer'

    WHEN p_action = 'dvir.submit' THEN v_role IN ('organizer', 'manager', 'driver', 'mechanic')
    WHEN p_action = 'dvir.view_all' THEN v_role IN ('organizer', 'manager', 'mechanic')

    WHEN p_action = 'org.settings' THEN v_role IN ('organizer', 'manager')
    WHEN p_action = 'org.manage' THEN v_role = 'organizer'

    WHEN p_action IN ('admin.access', 'admin.manage_users', 'admin.manage_all_fleets') THEN false
    ELSE false
  END;

  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'role', v_role,
    'reason', CASE WHEN v_allowed THEN 'role_allowed' ELSE 'role_denied' END
  );
END;
$$;

COMMENT ON FUNCTION public.rbac_check_permission(text, uuid) IS
  'Unified RBAC permission check. Returns {allowed, role, reason}.';

GRANT EXECUTE ON FUNCTION public.rbac_check_permission(text, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.rbac_check_permission(text, uuid) FROM anon;
