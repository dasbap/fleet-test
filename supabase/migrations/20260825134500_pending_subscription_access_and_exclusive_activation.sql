BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS abonnements_one_active_per_fleet_idx
ON public.abonnements (fleet_id)
WHERE status = 'active';

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
     SET status = 'cancelled',
         cancelled_at = COALESCE(cancelled_at, v_now),
         cancelled_by = COALESCE(cancelled_by, auth.uid()),
         ends_at = LEAST(COALESCE(ends_at, v_now), v_now)
   WHERE fleet_id = v_sub.fleet_id
     AND id <> p_subscription_id
     AND status = 'active';

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

CREATE OR REPLACE FUNCTION public.create_vehicle_with_subscription(
  p_fleet_id uuid,
  p_subscription_id uuid,
  p_registration text,
  p_brand text DEFAULT null,
  p_model text DEFAULT null,
  p_year integer DEFAULT null,
  p_current_km integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_check jsonb;
  v_target record;
  v_vehicle public.vehicules%rowtype;
  v_current_subscription_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'non_authentifie'; END IF;
  IF p_fleet_id IS NULL THEN RAISE EXCEPTION 'fleet_id_required'; END IF;
  IF p_subscription_id IS NULL THEN RAISE EXCEPTION 'subscription_id_required'; END IF;
  IF nullif(trim(coalesce(p_registration, '')), '') IS NULL THEN RAISE EXCEPTION 'registration_required'; END IF;

  v_check := public.rbac_check_permission('vehicle.create', p_fleet_id);
  IF NOT COALESCE((v_check->>'allowed')::boolean, false) THEN
    RAISE EXCEPTION 'permission_refusee_vehicle_create';
  END IF;

  SELECT a.id, a.fleet_id, a.status, a.starts_at, a.ends_at
    INTO v_target
    FROM public.abonnements a
   WHERE a.id = p_subscription_id
   FOR UPDATE;

  IF v_target.id IS NULL THEN RAISE EXCEPTION 'abonnement_introuvable'; END IF;
  IF v_target.fleet_id IS DISTINCT FROM p_fleet_id THEN RAISE EXCEPTION 'abonnement_flotte_incompatible'; END IF;

  IF v_target.status IN ('inactive', 'pending_payment') THEN
    PERFORM public.activate_fleet_subscription(p_subscription_id);
    SELECT a.id, a.fleet_id, a.status, a.starts_at, a.ends_at
      INTO v_target
      FROM public.abonnements a
     WHERE a.id = p_subscription_id;
  END IF;

  IF NOT public.is_vehicle_subscription_status_active(v_target.status) THEN
    RAISE EXCEPTION 'abonnement_inactif';
  END IF;
  IF COALESCE(v_target.starts_at, '-infinity'::timestamptz) > now() THEN
    RAISE EXCEPTION 'abonnement_pas_encore_actif';
  END IF;
  IF COALESCE(v_target.ends_at, 'infinity'::timestamptz) <= now() THEN
    RAISE EXCEPTION 'abonnement_expire';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_fleet_id::text, 2026081012));
  IF NOT public.can_create_vehicle(p_fleet_id) THEN
    RAISE EXCEPTION 'limite_vehicules_abonnement_atteinte';
  END IF;

  INSERT INTO public.vehicules (
    fleet_id, registration, brand, model, year, current_km, status
  ) VALUES (
    p_fleet_id,
    upper(trim(p_registration)),
    nullif(trim(coalesce(p_brand, '')), ''),
    nullif(trim(coalesce(p_model, '')), ''),
    p_year,
    greatest(coalesce(p_current_km, 0), 0),
    'ok'
  ) RETURNING * INTO v_vehicle;

  SELECT subscription_id
    INTO v_current_subscription_id
    FROM public.droits_vehicules
   WHERE vehicle_id = v_vehicle.id
     AND active = true
   FOR UPDATE;

  IF v_current_subscription_id IS DISTINCT FROM p_subscription_id THEN
    UPDATE public.droits_vehicules
       SET active = false, ended_at = now()
     WHERE vehicle_id = v_vehicle.id
       AND active = true;

    PERFORM public.assign_vehicle_to_subscription(v_vehicle.id, p_subscription_id, auth.uid());
  END IF;

  RETURN to_jsonb(v_vehicle);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_vehicle_with_subscription(uuid, uuid, text, text, text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_vehicle_with_subscription(uuid, uuid, text, text, text, integer, integer) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
