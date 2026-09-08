BEGIN;

CREATE OR REPLACE FUNCTION public.enforce_role_change_workflow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF new.role IS NOT DISTINCT FROM old.role THEN
    RETURN new;
  END IF;

  IF current_setting('app.role_change_approved', true) = 'on' THEN
    RETURN new;
  END IF;

  IF public.is_platform_super_admin() THEN
    RETURN new;
  END IF;

  RAISE EXCEPTION 'role_change_request_required';
END;
$$;

DROP TRIGGER IF EXISTS enforce_role_change_workflow_trigger ON public.flotte_adhesions;
CREATE TRIGGER enforce_role_change_workflow_trigger
BEFORE UPDATE OF role ON public.flotte_adhesions
FOR EACH ROW
EXECUTE FUNCTION public.enforce_role_change_workflow();

CREATE OR REPLACE FUNCTION public.review_fleet_role_change(
  p_request_id uuid,
  p_approve boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.fleet_role_change_requests%ROWTYPE;
BEGIN
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'platform_admin_required'; END IF;

  SELECT * INTO v_request
  FROM public.fleet_role_change_requests
  WHERE id = p_request_id AND status = 'pending'
  FOR UPDATE;

  IF v_request.id IS NULL THEN RAISE EXCEPTION 'request_not_found'; END IF;

  IF NOT p_approve THEN
    UPDATE public.fleet_role_change_requests
    SET status = 'rejected', reviewed_at = now(), reviewed_by = auth.uid()
    WHERE id = p_request_id;
    RETURN jsonb_build_object('ok', true, 'status', 'rejected');
  END IF;

  PERFORM set_config('app.role_change_approved', 'on', true);

  IF v_request.requested_role = 'organizer'::public.role_type THEN
    PERFORM set_config('app.organizer_transfer_bypass', 'on', true);
    UPDATE public.flotte_adhesions
    SET role = 'manager'::public.role_type
    WHERE fleet_id = v_request.fleet_id
      AND role = 'organizer'::public.role_type
      AND is_active = true
      AND user_id <> v_request.user_id;
  END IF;

  UPDATE public.flotte_adhesions
  SET role = v_request.requested_role, is_active = true
  WHERE fleet_id = v_request.fleet_id AND user_id = v_request.user_id;

  UPDATE public.fleet_role_change_requests
  SET status = 'approved', reviewed_at = now(), reviewed_by = auth.uid()
  WHERE id = p_request_id;

  RETURN jsonb_build_object('ok', true, 'status', 'approved', 'role', v_request.requested_role);
END;
$$;

CREATE OR REPLACE FUNCTION public.super_admin_transfer_organizer(
  p_fleet_id uuid,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_super_admin() THEN RAISE EXCEPTION 'super_admin_required'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.flotte_adhesions
    WHERE fleet_id = p_fleet_id AND user_id = p_user_id AND is_active = true
  ) THEN RAISE EXCEPTION 'membership_not_found'; END IF;

  PERFORM set_config('app.role_change_approved', 'on', true);
  PERFORM set_config('app.organizer_transfer_bypass', 'on', true);

  UPDATE public.flotte_adhesions
  SET role = 'manager'::public.role_type
  WHERE fleet_id = p_fleet_id
    AND role = 'organizer'::public.role_type
    AND is_active = true
    AND user_id <> p_user_id;

  UPDATE public.flotte_adhesions
  SET role = 'organizer'::public.role_type, is_active = true
  WHERE fleet_id = p_fleet_id AND user_id = p_user_id;

  RETURN jsonb_build_object('ok', true, 'fleet_id', p_fleet_id, 'user_id', p_user_id);
END;
$$;

COMMIT;
