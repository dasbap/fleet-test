BEGIN;

-- A fleet may own several simultaneous subscriptions, including several
-- subscriptions of the same plan. Capacity and vehicle entitlements are tracked
-- per subscription through abonnements.vehicle_slots and droits_vehicules.
DROP INDEX IF EXISTS public.abonnements_one_active_per_fleet_idx;

CREATE OR REPLACE FUNCTION public.activate_fleet_subscription(p_subscription_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub record;
  v_check jsonb;
  v_demo_eligible boolean := false;
  v_payment_succeeded boolean := false;
  v_duration interval;
  v_now timestamptz := now();
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'non_authentifie';
  END IF;

  SELECT id, fleet_id, status, starts_at, ends_at, payment_id, trial_ends_at
    INTO v_sub
    FROM public.abonnements
   WHERE id = p_subscription_id
   FOR UPDATE;

  IF v_sub.id IS NULL THEN
    RAISE EXCEPTION 'abonnement_introuvable';
  END IF;

  v_check := public.rbac_check_permission('billing.manage', v_sub.fleet_id);
  IF NOT COALESCE((v_check->>'allowed')::boolean, false) THEN
    RAISE EXCEPTION 'permission_refusee_abonnement';
  END IF;

  IF v_sub.status IN ('active', 'trial') THEN
    RETURN jsonb_build_object(
      'ok', true,
      'subscription_id', p_subscription_id,
      'status', v_sub.status
    );
  END IF;

  IF v_sub.status NOT IN ('inactive', 'pending_payment') THEN
    RAISE EXCEPTION 'abonnement_activation_statut_invalide';
  END IF;

  IF v_sub.payment_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
        FROM public.paiements p
       WHERE p.id = v_sub.payment_id
         AND p.status = 'succeeded'
    ) INTO v_payment_succeeded;
  END IF;

  SELECT EXISTS (
    SELECT 1
      FROM public.demo_profiles dp
      JOIN public.flotte_adhesions fa
        ON fa.user_id = dp.user_id
       AND fa.fleet_id = v_sub.fleet_id
     WHERE dp.user_id = auth.uid()
       AND dp.fleet_id = v_sub.fleet_id
       AND fa.role = 'organizer'::public.role_type
       AND fa.is_active = true
       AND dp.is_active = true
       AND dp.demo_role = 'organizer'
       AND (dp.expires_at IS NULL OR dp.expires_at > v_now)
       AND v_sub.payment_id IS NULL
       AND v_sub.trial_ends_at IS NOT NULL
       AND v_sub.trial_ends_at > v_now
  ) INTO v_demo_eligible;

  IF NOT v_payment_succeeded AND NOT v_demo_eligible THEN
    RAISE EXCEPTION 'abonnement_en_attente_paiement';
  END IF;

  v_duration := GREATEST(
    COALESCE(v_sub.ends_at, v_now + interval '1 month')
      - COALESCE(v_sub.starts_at, v_now),
    interval '1 day'
  );

  PERFORM pg_advisory_xact_lock(hashtextextended(v_sub.fleet_id::text, 202608251345));

  UPDATE public.abonnements
     SET status = 'active',
         starts_at = v_now,
         ends_at = v_now + v_duration,
         cancelled_at = NULL,
         cancelled_by = NULL
   WHERE id = p_subscription_id;

  RETURN jsonb_build_object(
    'ok', true,
    'subscription_id', p_subscription_id,
    'status', 'active'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.activate_fleet_subscription(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.activate_fleet_subscription(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.ensure_pending_subscription_for_payment(p_payment_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment record;
  v_plan record;
  v_subscription_id uuid;
  v_duration_months integer;
  v_vehicle_count integer;
  v_now timestamptz := now();
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'non_authentifie';
  END IF;

  SELECT p.id,
         p.org_id,
         p.status,
         p.raw_payload,
         (p.raw_payload->>'fleetId')::uuid AS fleet_id,
         trim(p.raw_payload->>'planCode') AS plan_code
    INTO v_payment
    FROM public.paiements p
   WHERE p.id = p_payment_id
   FOR UPDATE;

  IF v_payment.id IS NULL THEN
    RAISE EXCEPTION 'paiement_introuvable';
  END IF;

  IF v_payment.status <> 'pending' THEN
    RAISE EXCEPTION 'paiement_statut_invalide';
  END IF;

  IF v_payment.fleet_id IS NULL OR v_payment.plan_code IS NULL THEN
    RAISE EXCEPTION 'paiement_payload_invalide';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.flottes f
     WHERE f.id = v_payment.fleet_id
       AND f.org_id = v_payment.org_id
  ) THEN
    RAISE EXCEPTION 'flotte_organisation_incompatible';
  END IF;

  IF NOT COALESCE((public.rbac_check_permission('billing.manage', v_payment.fleet_id)->>'allowed')::boolean, false) THEN
    RAISE EXCEPTION 'permission_refusee_facturation';
  END IF;

  SELECT p.id, p.max_vehicles, p.max_vehicles_per_subscription
    INTO v_plan
    FROM public.plans p
   WHERE p.code = v_payment.plan_code
     AND p.is_active = true
   LIMIT 1;

  IF v_plan.id IS NULL THEN
    RAISE EXCEPTION 'plan_invalide';
  END IF;

  SELECT a.id
    INTO v_subscription_id
    FROM public.abonnements a
   WHERE a.payment_id = v_payment.id
   LIMIT 1;

  IF v_subscription_id IS NOT NULL THEN
    RETURN v_subscription_id;
  END IF;

  v_duration_months := LEAST(GREATEST(COALESCE((v_payment.raw_payload->>'durationMonths')::integer, 1), 1), 36);
  v_vehicle_count := GREATEST(COALESCE((v_payment.raw_payload->>'vehicleCount')::integer, 1), 1);

  INSERT INTO public.abonnements (
    fleet_id,
    plan_id,
    payment_id,
    starts_at,
    ends_at,
    status,
    vehicle_slots
  ) VALUES (
    v_payment.fleet_id,
    v_plan.id,
    v_payment.id,
    v_now,
    v_now + make_interval(months => v_duration_months),
    'pending_payment',
    LEAST(
      v_vehicle_count,
      COALESCE(v_plan.max_vehicles_per_subscription, v_plan.max_vehicles, v_vehicle_count)
    )
  )
  RETURNING id INTO v_subscription_id;

  RETURN v_subscription_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ensure_pending_subscription_for_payment(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_pending_subscription_for_payment(uuid) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
