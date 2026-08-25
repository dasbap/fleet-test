BEGIN;

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
  p_checkout boolean DEFAULT false,
  p_subscription_id uuid DEFAULT NULL,
  p_provider_reference text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_check jsonb;
  v_plan record;
  v_subscription_plan_id uuid;
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

  IF p_subscription_id IS NOT NULL THEN
    SELECT a.plan_id
      INTO v_subscription_plan_id
      FROM public.abonnements a
     WHERE a.id = p_subscription_id
       AND a.fleet_id = p_fleet_id;

    IF v_subscription_plan_id IS NULL THEN
      RAISE EXCEPTION 'abonnement_flotte_incompatible';
    END IF;
  END IF;

  IF p_vehicle_count < 1 OR p_duration_months < 1 OR p_duration_months > 36 THEN
    RAISE EXCEPTION 'parametres_facturation_invalides';
  END IF;

  IF p_provider NOT IN ('manual', 'cinetpay', 'notch', 'orange_money', 'mtn_momo', 'fapshi') THEN
    RAISE EXCEPTION 'provider_invalide';
  END IF;

  IF length(trim(COALESCE(p_external_ref, ''))) < 8
     OR length(p_external_ref) > 200
     OR length(trim(COALESCE(p_idempotency_key, ''))) < 8
     OR length(p_idempotency_key) > 200 THEN
    RAISE EXCEPTION 'reference_paiement_invalide';
  END IF;

  IF p_provider_reference IS NOT NULL AND length(p_provider_reference) > 200 THEN
    RAISE EXCEPTION 'provider_reference_invalide';
  END IF;

  SELECT p.id, p.code, p.price_per_vehicle, p.max_vehicles, p.is_active
    INTO v_plan
    FROM public.plans p
   WHERE p.code = trim(p_plan_code)
   LIMIT 1;

  IF v_plan.id IS NULL OR NOT v_plan.is_active THEN
    RAISE EXCEPTION 'plan_invalide';
  END IF;

  IF v_subscription_plan_id IS NOT NULL
     AND v_subscription_plan_id IS DISTINCT FROM v_plan.id THEN
    RAISE EXCEPTION 'abonnement_plan_incompatible';
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

  IF p_subscription_id IS NOT NULL THEN
    v_raw_payload := v_raw_payload || jsonb_build_object('subscriptionId', p_subscription_id);
  END IF;

  IF p_provider = 'notch' THEN
    v_raw_payload := v_raw_payload || jsonb_build_object('notchRef', p_external_ref);
  END IF;

  IF p_provider = 'fapshi' AND p_subscription_id IS NOT NULL THEN
    v_raw_payload := v_raw_payload || jsonb_build_object('fapshiExternalId', p_subscription_id);
  END IF;

  INSERT INTO public.paiements (
    org_id,
    provider,
    amount,
    currency,
    status,
    external_ref,
    provider_reference,
    idempotency_key,
    raw_payload
  ) VALUES (
    p_org_id,
    p_provider,
    v_amount,
    'XAF',
    'pending',
    p_external_ref,
    nullif(trim(COALESCE(p_provider_reference, '')), ''),
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

REVOKE EXECUTE ON FUNCTION public.create_payment_intent(
  uuid, uuid, text, integer, integer, text, text, text, numeric, uuid[], text, boolean, uuid, text
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_payment_intent(
  uuid, uuid, text, integer, integer, text, text, text, numeric, uuid[], text, boolean, uuid, text
) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
