BEGIN;

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
  v_internal_role text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'role', null, 'reason', 'session_expired');
  END IF;

  IF public.is_platform_admin() THEN
    RETURN jsonb_build_object('allowed', true, 'role', 'admin', 'reason', 'platform_admin');
  END IF;

  IF p_fleet_id IS NULL AND p_action IN (
    'fleet.view', 'fleet.create', 'fleet.update', 'fleet.delete',
    'vehicle.view', 'vehicle.create', 'vehicle.update', 'vehicle.delete', 'vehicle.assign_driver',
    'member.view', 'member.invite', 'member.remove', 'member.update_role',
    'maintenance.view', 'maintenance.create', 'maintenance.update', 'maintenance.delete',
    'assignment.view_own', 'assignment.view_all', 'assignment.manage',
    'report.view', 'report.export',
    'billing.view', 'billing.manage',
    'dvir.submit', 'dvir.view_all',
    'org.settings', 'org.manage'
  ) THEN
    RETURN jsonb_build_object('allowed', false, 'role', null, 'reason', 'missing_fleet_scope');
  END IF;

  v_internal_role := public.get_effective_internal_role();

  IF v_internal_role = 'dev'
     AND p_action IN (
       'fleet.view', 'vehicle.view', 'member.view', 'maintenance.view',
       'assignment.view_all', 'report.view', 'dvir.view_all'
     ) THEN
    RETURN jsonb_build_object('allowed', true, 'role', 'dev', 'reason', 'internal_read_only');
  END IF;

  IF v_internal_role = 'commercial'
     AND p_fleet_id IS NOT NULL
     AND p_action IN ('fleet.view', 'vehicle.view', 'member.view', 'report.view')
     AND EXISTS (
       SELECT 1 FROM public.flottes f
        WHERE f.id = p_fleet_id
          AND f.is_demo = true
     ) THEN
    RETURN jsonb_build_object('allowed', true, 'role', 'commercial', 'reason', 'demo_read_only');
  END IF;

  IF p_fleet_id IS NOT NULL THEN
    SELECT fa.role::text
      INTO v_role
      FROM public.flotte_adhesions fa
     WHERE fa.user_id = auth.uid()
       AND fa.fleet_id = p_fleet_id
       AND fa.is_active = true
     ORDER BY fa.created_at DESC
     LIMIT 1;
  ELSE
    v_role := NULL;
  END IF;

  IF v_role IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'role', COALESCE(v_internal_role, null), 'reason', 'no_fleet_access');
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

REVOKE EXECUTE ON FUNCTION public.rbac_check_permission(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rbac_check_permission(text, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.prevent_last_active_organizer_loss()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_removes_organizer boolean;
BEGIN
  IF OLD.role IS DISTINCT FROM 'organizer'::public.role_type OR OLD.is_active IS DISTINCT FROM true THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  v_removes_organizer := TG_OP = 'DELETE';
  IF TG_OP = 'UPDATE' THEN
    v_removes_organizer :=
      NEW.fleet_id IS DISTINCT FROM OLD.fleet_id
      OR NEW.role IS DISTINCT FROM 'organizer'::public.role_type
      OR NEW.is_active IS DISTINCT FROM true;
  END IF;

  IF NOT v_removes_organizer THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' AND NOT EXISTS (
    SELECT 1 FROM public.flottes f WHERE f.id = OLD.fleet_id
  ) THEN
    RETURN OLD;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(OLD.fleet_id::text, 0));

  IF NOT EXISTS (
    SELECT 1
      FROM public.flotte_adhesions fa
     WHERE fa.fleet_id = OLD.fleet_id
       AND fa.id IS DISTINCT FROM OLD.id
       AND fa.role = 'organizer'::public.role_type
       AND fa.is_active = true
  ) THEN
    RAISE EXCEPTION 'last_active_organizer_required';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_last_active_organizer_loss() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_prevent_last_active_organizer_loss ON public.flotte_adhesions;
CREATE TRIGGER trg_prevent_last_active_organizer_loss
BEFORE UPDATE OR DELETE ON public.flotte_adhesions
FOR EACH ROW
EXECUTE FUNCTION public.prevent_last_active_organizer_loss();

ALTER TABLE public.payment_webhook_effect_claims
  ADD COLUMN IF NOT EXISTS claim_token uuid;

DROP FUNCTION IF EXISTS public.claim_payment_webhook_effects(uuid, integer);
DROP FUNCTION IF EXISTS public.complete_payment_webhook_effects(uuid);
DROP FUNCTION IF EXISTS public.release_payment_webhook_effects(uuid);

CREATE OR REPLACE FUNCTION public.claim_payment_webhook_effects(
  p_payment_id uuid,
  p_lease_seconds integer DEFAULT 900
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token uuid := gen_random_uuid();
  v_claimed uuid;
  v_lease interval;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_payment_id IS NULL OR p_lease_seconds < 30 OR p_lease_seconds > 900 THEN
    RETURN NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.paiements WHERE id = p_payment_id) THEN
    RETURN NULL;
  END IF;

  v_lease := make_interval(secs => p_lease_seconds);

  INSERT INTO public.payment_webhook_effect_claims (
    payment_id,
    claimed_at,
    lease_until,
    completed_at,
    claim_token
  ) VALUES (
    p_payment_id,
    now(),
    now() + v_lease,
    NULL,
    v_token
  )
  ON CONFLICT (payment_id) DO NOTHING
  RETURNING claim_token INTO v_claimed;

  IF v_claimed IS NOT NULL THEN
    RETURN v_claimed;
  END IF;

  UPDATE public.payment_webhook_effect_claims
     SET claimed_at = now(),
         lease_until = now() + v_lease,
         claim_token = v_token
   WHERE payment_id = p_payment_id
     AND completed_at IS NULL
     AND lease_until <= now()
  RETURNING claim_token INTO v_claimed;

  RETURN v_claimed;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_payment_webhook_effects(
  p_payment_id uuid,
  p_claim_token uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated integer;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.payment_webhook_effect_claims
     SET completed_at = now(),
         lease_until = now()
   WHERE payment_id = p_payment_id
     AND claim_token = p_claim_token
     AND completed_at IS NULL
     AND lease_until > now();

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated = 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_payment_webhook_effects(
  p_payment_id uuid,
  p_claim_token uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated integer;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.payment_webhook_effect_claims
     SET lease_until = now()
   WHERE payment_id = p_payment_id
     AND claim_token = p_claim_token
     AND completed_at IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated = 1;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_payment_webhook_effects(uuid, integer)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.complete_payment_webhook_effects(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_payment_webhook_effects(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_payment_webhook_effects(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_payment_webhook_effects(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_payment_webhook_effects(uuid, uuid) TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
