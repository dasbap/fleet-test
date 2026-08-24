BEGIN;

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

  IF auth.role() <> 'service_role'
     AND p_user_id IS DISTINCT FROM auth.uid()
     AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'permission_refusee_identite';
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
    SELECT fa.role::text
      INTO v_role
      FROM public.flotte_adhesions fa
     WHERE fa.user_id = auth.uid()
       AND fa.is_active = true
     ORDER BY CASE fa.role::text
       WHEN 'organizer' THEN 1
       WHEN 'manager' THEN 2
       WHEN 'mechanic' THEN 3
       WHEN 'driver' THEN 4
       ELSE 5
     END
     LIMIT 1;
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

REVOKE ALL ON TABLE public.access_codes FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.access_code_uses FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.access_codes TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.access_code_uses TO service_role;
REVOKE EXECUTE ON FUNCTION public.access_code_generate(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.access_code_generate(text) TO service_role;

UPDATE public.access_codes
   SET is_active = false
 WHERE is_active = true
   AND code ~ '^[A-Z]+-[A-Z0-9]+-[A-Z0-9]+-[0-9]{4}$';

CREATE OR REPLACE FUNCTION public.create_payment_intent(
  p_org_id uuid,
  p_fleet_id uuid,
  p_plan_code text,
  p_vehicle_count integer,
  p_duration_months integer,
  p_provider text,
  p_external_ref text,
  p_idempotency_key text,
  p_expected_amount numeric,
  p_vehicle_ids uuid[] DEFAULT NULL,
  p_phone_number text DEFAULT NULL,
  p_checkout boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_check jsonb;
  v_plan record;
  v_amount numeric;
  v_payment_id uuid;
  v_status text;
  v_raw_payload jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'non_authentifie';
  END IF;

  IF p_org_id IS NULL OR p_fleet_id IS NULL THEN
    RAISE EXCEPTION 'organisation_flotte_requise';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.flottes f
     WHERE f.id = p_fleet_id
       AND f.org_id = p_org_id
  ) THEN
    RAISE EXCEPTION 'flotte_organisation_incompatible';
  END IF;

  v_check := public.rbac_check_permission('billing.manage', p_fleet_id);
  IF NOT COALESCE((v_check->>'allowed')::boolean, false) THEN
    RAISE EXCEPTION 'permission_refusee_facturation';
  END IF;

  IF p_vehicle_count < 1 OR p_duration_months < 1 OR p_duration_months > 36 THEN
    RAISE EXCEPTION 'parametres_facturation_invalides';
  END IF;

  IF p_provider NOT IN ('manual', 'cinetpay', 'notch', 'orange_money', 'mtn_momo') THEN
    RAISE EXCEPTION 'provider_invalide';
  END IF;

  IF length(trim(COALESCE(p_external_ref, ''))) < 8
     OR length(p_external_ref) > 200
     OR length(trim(COALESCE(p_idempotency_key, ''))) < 8
     OR length(p_idempotency_key) > 200 THEN
    RAISE EXCEPTION 'reference_paiement_invalide';
  END IF;

  SELECT p.id, p.code, p.price_per_vehicle, p.max_vehicles, p.is_active
    INTO v_plan
    FROM public.plans p
   WHERE p.code = trim(p_plan_code)
   LIMIT 1;

  IF v_plan.id IS NULL OR NOT v_plan.is_active THEN
    RAISE EXCEPTION 'plan_invalide';
  END IF;

  IF v_plan.max_vehicles IS NOT NULL AND p_vehicle_count > v_plan.max_vehicles THEN
    RAISE EXCEPTION 'limite_vehicules_plan_depassee';
  END IF;

  IF p_vehicle_ids IS NOT NULL THEN
    IF cardinality(p_vehicle_ids) <> p_vehicle_count THEN
      RAISE EXCEPTION 'vehicle_count_mismatch';
    END IF;

    IF (SELECT count(DISTINCT x) FROM unnest(p_vehicle_ids) AS x) <> p_vehicle_count THEN
      RAISE EXCEPTION 'duplicate_vehicle_ids';
    END IF;

    IF (
      SELECT count(*)
        FROM public.vehicules v
       WHERE v.fleet_id = p_fleet_id
         AND v.id = ANY(p_vehicle_ids)
    ) <> p_vehicle_count THEN
      RAISE EXCEPTION 'vehicle_fleet_mismatch';
    END IF;
  END IF;

  v_amount := v_plan.price_per_vehicle * p_vehicle_count * p_duration_months;
  IF v_amount <= 0 OR p_expected_amount IS DISTINCT FROM v_amount THEN
    RAISE EXCEPTION 'montant_paiement_invalide';
  END IF;

  v_raw_payload := jsonb_build_object(
    'planCode', v_plan.code,
    'vehicleCount', p_vehicle_count,
    'durationMonths', p_duration_months,
    'fleetId', p_fleet_id
  );

  IF p_vehicle_ids IS NOT NULL THEN
    v_raw_payload := v_raw_payload || jsonb_build_object('vehicleIds', to_jsonb(p_vehicle_ids));
  END IF;

  IF nullif(trim(COALESCE(p_phone_number, '')), '') IS NOT NULL THEN
    v_raw_payload := v_raw_payload || jsonb_build_object('phoneNumber', left(trim(p_phone_number), 64));
  END IF;

  IF p_checkout THEN
    v_raw_payload := v_raw_payload || jsonb_build_object('checkout', true);
  END IF;

  IF p_provider = 'notch' THEN
    v_raw_payload := v_raw_payload || jsonb_build_object('notchRef', p_external_ref);
  END IF;

  INSERT INTO public.paiements (
    org_id,
    provider,
    amount,
    currency,
    status,
    external_ref,
    idempotency_key,
    raw_payload
  ) VALUES (
    p_org_id,
    p_provider,
    v_amount,
    'XAF',
    'pending',
    p_external_ref,
    p_idempotency_key,
    v_raw_payload
  )
  RETURNING id, status INTO v_payment_id, v_status;

  RETURN jsonb_build_object(
    'payment_id', v_payment_id,
    'status', v_status,
    'amount_xaf', v_amount,
    'currency', 'XAF'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_payment_intent(uuid, uuid, text, integer, integer, text, text, text, numeric, uuid[], text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_payment_intent(uuid, uuid, text, integer, integer, text, text, text, numeric, uuid[], text, boolean) TO authenticated, service_role;

DROP POLICY IF EXISTS paiements_insert_manager_org ON public.paiements;
DROP POLICY IF EXISTS paiements_update_manager_org ON public.paiements;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.paiements FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.paiements TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
