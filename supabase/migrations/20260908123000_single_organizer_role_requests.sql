BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS flotte_adhesions_one_active_organizer
ON public.flotte_adhesions (fleet_id)
WHERE role = 'organizer'::public.role_type AND is_active = true;

CREATE TABLE IF NOT EXISTS public.fleet_role_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_id uuid NOT NULL REFERENCES public.flottes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_role public.role_type NOT NULL,
  requested_role public.role_type NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CHECK (current_role IS DISTINCT FROM requested_role)
);

CREATE UNIQUE INDEX IF NOT EXISTS fleet_role_change_requests_one_pending
ON public.fleet_role_change_requests (fleet_id, user_id)
WHERE status = 'pending';

ALTER TABLE public.fleet_role_change_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.fleet_role_change_requests FROM anon;
GRANT SELECT, INSERT ON public.fleet_role_change_requests TO authenticated;

DROP POLICY IF EXISTS fleet_role_change_requests_select ON public.fleet_role_change_requests;
CREATE POLICY fleet_role_change_requests_select
ON public.fleet_role_change_requests
FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()) OR public.is_platform_admin());

DROP POLICY IF EXISTS fleet_role_change_requests_insert ON public.fleet_role_change_requests;
CREATE POLICY fleet_role_change_requests_insert
ON public.fleet_role_change_requests
FOR INSERT TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.flotte_adhesions fa
    WHERE fa.fleet_id = fleet_role_change_requests.fleet_id
      AND fa.user_id = (SELECT auth.uid())
      AND fa.is_active = true
      AND fa.role = fleet_role_change_requests.current_role
  )
);

CREATE OR REPLACE FUNCTION public.request_fleet_role_change(
  p_fleet_id uuid,
  p_requested_role public.role_type
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_current_role public.role_type;
  v_request_id uuid;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'non_authentifie'; END IF;

  SELECT role INTO v_current_role
  FROM public.flotte_adhesions
  WHERE fleet_id = p_fleet_id AND user_id = v_user_id AND is_active = true
  LIMIT 1;

  IF v_current_role IS NULL THEN RAISE EXCEPTION 'membership_not_found'; END IF;
  IF v_current_role IS NOT DISTINCT FROM p_requested_role THEN RAISE EXCEPTION 'role_unchanged'; END IF;

  INSERT INTO public.fleet_role_change_requests (fleet_id, user_id, current_role, requested_role)
  VALUES (p_fleet_id, v_user_id, v_current_role, p_requested_role)
  ON CONFLICT (fleet_id, user_id) WHERE status = 'pending'
  DO UPDATE SET current_role = EXCLUDED.current_role, requested_role = EXCLUDED.requested_role, requested_at = now()
  RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.request_fleet_role_change(uuid, public.role_type) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_fleet_role_change(uuid, public.role_type) TO authenticated;

CREATE OR REPLACE FUNCTION public.prevent_last_active_organizer_loss()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_removes_organizer boolean;
BEGIN
  IF old.role IS DISTINCT FROM 'organizer'::public.role_type OR old.is_active IS DISTINCT FROM true THEN
    IF tg_op = 'DELETE' THEN RETURN old; END IF;
    RETURN new;
  END IF;

  v_removes_organizer := tg_op = 'DELETE';
  IF tg_op = 'UPDATE' THEN
    v_removes_organizer := new.fleet_id IS DISTINCT FROM old.fleet_id
      OR new.role IS DISTINCT FROM 'organizer'::public.role_type
      OR new.is_active IS DISTINCT FROM true;
  END IF;

  IF NOT v_removes_organizer THEN RETURN new; END IF;

  IF current_setting('app.organizer_transfer_bypass', true) = 'on' AND public.is_platform_admin() THEN
    IF tg_op = 'DELETE' THEN RETURN old; END IF;
    RETURN new;
  END IF;

  IF tg_op = 'DELETE' AND NOT EXISTS (SELECT 1 FROM public.flottes f WHERE f.id = old.fleet_id) THEN
    RETURN old;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.flotte_adhesions fa
    WHERE fa.fleet_id = old.fleet_id
      AND fa.id IS DISTINCT FROM old.id
      AND fa.role = 'organizer'::public.role_type
      AND fa.is_active = true
  ) THEN
    RAISE EXCEPTION 'last_active_organizer_required';
  END IF;

  IF tg_op = 'DELETE' THEN RETURN old; END IF;
  RETURN new;
END;
$$;

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

REVOKE EXECUTE ON FUNCTION public.review_fleet_role_change(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_fleet_role_change(uuid, boolean) TO authenticated;

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

REVOKE EXECUTE ON FUNCTION public.super_admin_transfer_organizer(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.super_admin_transfer_organizer(uuid, uuid) TO authenticated;

COMMIT;
