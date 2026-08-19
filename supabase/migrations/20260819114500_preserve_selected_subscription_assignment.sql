-- Preserve the existing auto-assignment trigger semantics while keeping the
-- inactive-subscription hardening introduced by the previous migration.
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
  v_demo_eligible boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'non_authentifie'; END IF;
  IF p_fleet_id IS NULL THEN RAISE EXCEPTION 'fleet_id_required'; END IF;
  IF p_subscription_id IS NULL THEN RAISE EXCEPTION 'subscription_id_required'; END IF;
  IF nullif(trim(coalesce(p_registration, '')), '') IS NULL THEN RAISE EXCEPTION 'registration_required'; END IF;

  v_check := public.rbac_check_permission('vehicle.create', p_fleet_id);
  IF NOT COALESCE((v_check->>'allowed')::boolean, false) THEN
    RAISE EXCEPTION 'permission_refusee_vehicle_create';
  END IF;

  SELECT a.id, a.fleet_id, a.status, a.ends_at, a.payment_id, a.trial_ends_at
    INTO v_target
    FROM public.abonnements a
   WHERE a.id = p_subscription_id
   FOR UPDATE;
  IF v_target.id IS NULL THEN RAISE EXCEPTION 'abonnement_introuvable'; END IF;
  IF v_target.fleet_id IS DISTINCT FROM p_fleet_id THEN RAISE EXCEPTION 'abonnement_flotte_incompatible'; END IF;

  IF v_target.status = 'inactive' THEN
    SELECT EXISTS (
      SELECT 1
        FROM public.demo_profiles dp
        JOIN public.flotte_adhesions fa ON fa.user_id = dp.user_id
       WHERE fa.fleet_id = p_fleet_id
         AND fa.role = 'organizer'::public.role_type
         AND fa.is_active = true
         AND dp.is_active = true
         AND dp.demo_role = 'organizer'
         AND (dp.expires_at IS NULL OR dp.expires_at > now())
         AND v_target.payment_id IS NULL
         AND v_target.trial_ends_at IS NOT NULL
         AND v_target.trial_ends_at > now()
    ) INTO v_demo_eligible;
    IF NOT v_demo_eligible THEN RAISE EXCEPTION 'abonnement_inactif_non_activable'; END IF;
    UPDATE public.abonnements SET status = 'active' WHERE id = p_subscription_id;
    v_target.status := 'active';
  END IF;

  IF NOT public.is_vehicle_subscription_status_active(v_target.status) THEN
    RAISE EXCEPTION 'abonnement_inactif';
  END IF;
  IF COALESCE(v_target.ends_at, '9999-12-31 23:59:59+00'::timestamptz) <= now() THEN
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

  -- The AFTER INSERT auto-assignment trigger may already have allocated a slot.
  -- Honor the explicit subscription selected by the caller without double-counting.
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
