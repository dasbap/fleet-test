BEGIN;

CREATE OR REPLACE FUNCTION public.creer_ou_mettre_a_jour_adhesion_flotte(
  p_fleet_id uuid,
  p_user_id uuid,
  p_role public.role_type,
  p_is_active boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_membership_id uuid;
  v_existing_role public.role_type;
  v_existing_active boolean;
  v_check jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Permission refusee : utilisateur non authentifie.';
  END IF;

  SELECT fa.role, fa.is_active
    INTO v_existing_role, v_existing_active
    FROM public.flotte_adhesions fa
   WHERE fa.fleet_id = p_fleet_id
     AND fa.user_id = p_user_id
   LIMIT 1;

  IF v_existing_role = 'organizer'::public.role_type
     AND v_existing_active = true
     AND (NOT p_is_active OR p_role IS DISTINCT FROM 'organizer'::public.role_type) THEN
    PERFORM 1
      FROM public.flotte_adhesions fa
     WHERE fa.fleet_id = p_fleet_id
       AND fa.role = 'organizer'::public.role_type
       AND fa.is_active = true
     FOR UPDATE;

    IF NOT EXISTS (
      SELECT 1
        FROM public.flotte_adhesions fa
       WHERE fa.fleet_id = p_fleet_id
         AND fa.user_id IS DISTINCT FROM p_user_id
         AND fa.role = 'organizer'::public.role_type
         AND fa.is_active = true
    ) THEN
      RAISE EXCEPTION 'dernier_organizer_requis';
    END IF;
  END IF;

  IF v_existing_role IS NULL THEN
    v_check := public.rbac_check_permission('member.invite', p_fleet_id);
    IF NOT COALESCE((v_check->>'allowed')::boolean, false) THEN
      RAISE EXCEPTION 'Permission refusee : member.invite requis.';
    END IF;

    IF p_role = 'organizer'::public.role_type
       AND NOT public.has_role(p_fleet_id, 'organizer'::public.role_type)
       AND NOT public.is_platform_admin() THEN
      RAISE EXCEPTION 'Permission refusee : promotion organizer interdite.';
    END IF;
  ELSIF v_existing_role IS DISTINCT FROM p_role THEN
    v_check := public.rbac_check_permission('member.update_role', p_fleet_id);
    IF NOT COALESCE((v_check->>'allowed')::boolean, false) THEN
      RAISE EXCEPTION 'Permission refusee : seul organizer peut modifier les roles.';
    END IF;
  END IF;

  IF NOT p_is_active THEN
    v_check := public.rbac_check_permission('member.remove', p_fleet_id);
    IF NOT COALESCE((v_check->>'allowed')::boolean, false)
       AND NOT public.is_platform_admin() THEN
      RAISE EXCEPTION 'Permission refusee : member.remove requis.';
    END IF;
  ELSIF v_existing_role IS NOT NULL
        AND v_existing_active IS FALSE
        AND v_existing_role IS NOT DISTINCT FROM p_role THEN
    v_check := public.rbac_check_permission('member.invite', p_fleet_id);
    IF NOT COALESCE((v_check->>'allowed')::boolean, false)
       AND NOT public.is_platform_admin() THEN
      RAISE EXCEPTION 'Permission refusee : member.invite requis pour reactiver.';
    END IF;
  END IF;

  INSERT INTO public.flotte_adhesions (fleet_id, user_id, role, is_active)
  VALUES (p_fleet_id, p_user_id, p_role, p_is_active)
  ON CONFLICT (fleet_id, user_id) DO UPDATE SET
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active,
    created_at = CASE
      WHEN public.flotte_adhesions.is_active = false AND EXCLUDED.is_active = true
      THEN now()
      ELSE public.flotte_adhesions.created_at
    END
  RETURNING id INTO v_membership_id;

  RETURN v_membership_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.creer_ou_mettre_a_jour_adhesion_flotte(uuid, uuid, public.role_type, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.creer_ou_mettre_a_jour_adhesion_flotte(uuid, uuid, public.role_type, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.activate_fleet_subscription(p_subscription_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub record;
  v_check jsonb;
  v_demo_eligible boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'non_authentifie'; END IF;

  SELECT id, fleet_id, status, starts_at, ends_at, payment_id, trial_ends_at
    INTO v_sub
    FROM public.abonnements
   WHERE id = p_subscription_id
   FOR UPDATE;
  IF v_sub.id IS NULL THEN RAISE EXCEPTION 'abonnement_introuvable'; END IF;

  v_check := public.rbac_check_permission('billing.manage', v_sub.fleet_id);
  IF NOT COALESCE((v_check->>'allowed')::boolean, false) THEN
    RAISE EXCEPTION 'permission_refusee_abonnement';
  END IF;
  IF COALESCE(v_sub.starts_at, '-infinity'::timestamptz) > now() THEN
    RAISE EXCEPTION 'abonnement_pas_encore_actif';
  END IF;
  IF COALESCE(v_sub.ends_at, 'infinity'::timestamptz) <= now() THEN
    RAISE EXCEPTION 'abonnement_expire';
  END IF;
  IF v_sub.status IN ('active', 'trial') THEN
    RETURN jsonb_build_object('ok', true, 'subscription_id', p_subscription_id, 'status', v_sub.status);
  END IF;
  IF v_sub.status <> 'inactive' THEN RAISE EXCEPTION 'abonnement_activation_statut_invalide'; END IF;

  SELECT EXISTS (
    SELECT 1
      FROM public.demo_profiles dp
      JOIN public.flotte_adhesions fa
        ON fa.user_id = dp.user_id
       AND fa.fleet_id = v_sub.fleet_id
     WHERE dp.user_id = auth.uid()
       AND fa.user_id = auth.uid()
       AND dp.fleet_id = v_sub.fleet_id
       AND fa.role = 'organizer'::public.role_type
       AND fa.is_active = true
       AND dp.is_active = true
       AND dp.demo_role = 'organizer'
       AND (dp.expires_at IS NULL OR dp.expires_at > now())
       AND v_sub.payment_id IS NULL
       AND v_sub.trial_ends_at IS NOT NULL
       AND v_sub.trial_ends_at > now()
  ) INTO v_demo_eligible;
  IF NOT v_demo_eligible THEN RAISE EXCEPTION 'abonnement_inactif_non_activable'; END IF;

  UPDATE public.abonnements SET status = 'active' WHERE id = p_subscription_id;
  RETURN jsonb_build_object('ok', true, 'subscription_id', p_subscription_id, 'status', 'active');
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

  SELECT a.id, a.fleet_id, a.status, a.starts_at, a.ends_at, a.payment_id, a.trial_ends_at
    INTO v_target
    FROM public.abonnements a
   WHERE a.id = p_subscription_id
   FOR UPDATE;
  IF v_target.id IS NULL THEN RAISE EXCEPTION 'abonnement_introuvable'; END IF;
  IF v_target.fleet_id IS DISTINCT FROM p_fleet_id THEN RAISE EXCEPTION 'abonnement_flotte_incompatible'; END IF;
  IF COALESCE(v_target.starts_at, '-infinity'::timestamptz) > now() THEN
    RAISE EXCEPTION 'abonnement_pas_encore_actif';
  END IF;

  IF v_target.status = 'inactive' THEN
    SELECT EXISTS (
      SELECT 1
        FROM public.demo_profiles dp
        JOIN public.flotte_adhesions fa
          ON fa.user_id = dp.user_id
         AND fa.fleet_id = p_fleet_id
       WHERE dp.user_id = auth.uid()
         AND fa.user_id = auth.uid()
         AND dp.fleet_id = p_fleet_id
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

CREATE OR REPLACE FUNCTION public.get_subscription_available_slots(p_subscription_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_sub record;
  v_check jsonb;
  v_capacity jsonb;
  v_limit int;
  v_used int;
BEGIN
  SELECT a.id, a.fleet_id, a.status, a.starts_at, a.ends_at, a.vehicle_slots,
         p.code AS plan_code, p.max_vehicles, p.max_vehicles_per_subscription
    INTO v_sub
    FROM public.abonnements a
    JOIN public.plans p ON p.id = a.plan_id
   WHERE a.id = p_subscription_id;

  IF v_sub.id IS NULL THEN RETURN 0; END IF;

  IF auth.role() <> 'service_role' THEN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'non_authentifie'; END IF;
    v_check := public.rbac_check_permission('billing.view', v_sub.fleet_id);
    IF NOT COALESCE((v_check->>'allowed')::boolean, false) THEN
      RAISE EXCEPTION 'permission_refusee_abonnement';
    END IF;
  END IF;

  IF NOT public.is_vehicle_subscription_status_active(v_sub.status) THEN RETURN 0; END IF;
  IF COALESCE(v_sub.starts_at, '-infinity'::timestamptz) > now() THEN RETURN 0; END IF;
  IF COALESCE(v_sub.ends_at, 'infinity'::timestamptz) <= now() THEN RETURN 0; END IF;

  v_capacity := public.subscription_plan_capacity(
    v_sub.plan_code,
    v_sub.max_vehicles,
    COALESCE(v_sub.vehicle_slots, v_sub.max_vehicles_per_subscription)
  );
  v_limit := (v_capacity->>'vehicles_per_subscription')::int;

  SELECT count(*)::int INTO v_used
    FROM public.droits_vehicules
   WHERE subscription_id = p_subscription_id
     AND active = true;

  RETURN greatest(0, v_limit - v_used);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_subscription_available_slots(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_subscription_available_slots(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.can_create_vehicle(p_fleet_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_check jsonb;
  v_slots int;
  v_used int;
BEGIN
  IF auth.role() <> 'service_role' THEN
    IF auth.uid() IS NULL THEN RETURN false; END IF;
    v_check := public.rbac_check_permission('vehicle.create', p_fleet_id);
    IF NOT COALESCE((v_check->>'allowed')::boolean, false) THEN RETURN false; END IF;
  END IF;

  SELECT COALESCE(sum(
    (public.subscription_plan_capacity(
      p.code, p.max_vehicles, COALESCE(a.vehicle_slots, p.max_vehicles_per_subscription)
    )->>'vehicles_per_subscription')::int
  ), 0)
    INTO v_slots
    FROM public.abonnements a
    JOIN public.plans p ON p.id = a.plan_id
   WHERE a.fleet_id = p_fleet_id
     AND public.is_vehicle_subscription_status_active(a.status)
     AND COALESCE(a.starts_at, '-infinity'::timestamptz) <= now()
     AND COALESCE(a.ends_at, 'infinity'::timestamptz) > now();

  SELECT count(*)::int INTO v_used
    FROM public.droits_vehicules dv
    JOIN public.abonnements a ON a.id = dv.subscription_id
   WHERE a.fleet_id = p_fleet_id
     AND dv.active = true
     AND public.is_vehicle_subscription_status_active(a.status)
     AND COALESCE(a.starts_at, '-infinity'::timestamptz) <= now()
     AND COALESCE(a.ends_at, 'infinity'::timestamptz) > now();

  RETURN v_slots > v_used;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.can_create_vehicle(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_create_vehicle(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_plan_access(p_fleet_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_check jsonb;
  v_result jsonb;
BEGIN
  IF auth.role() <> 'service_role' THEN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'non_authentifie'; END IF;
    v_check := public.rbac_check_permission('fleet.view', p_fleet_id);
    IF NOT COALESCE((v_check->>'allowed')::boolean, false) THEN
      RAISE EXCEPTION 'permission_refusee_flotte';
    END IF;
  END IF;

  WITH active_sub AS (
    SELECT a.status, p.code AS plan_code, p.max_vehicles,
           p.enables_finance, p.enables_ai, p.enables_reports,
           p.enables_driver_scoring, p.enables_anomaly_insights,
           p.enables_geofencing, p.enables_scheduled_reports,
           p.enables_offline_driver
      FROM public.abonnements a
      JOIN public.plans p ON p.id = a.plan_id
     WHERE a.fleet_id = p_fleet_id
       AND public.is_vehicle_subscription_status_active(a.status)
       AND COALESCE(a.starts_at, '-infinity'::timestamptz) <= now()
       AND COALESCE(a.ends_at, 'infinity'::timestamptz) > now()
     ORDER BY a.ends_at DESC NULLS LAST, a.starts_at DESC, a.id DESC
     LIMIT 1
  ),
  total_slots AS (
    SELECT COALESCE(sum(
      (public.subscription_plan_capacity(
        p.code, p.max_vehicles, COALESCE(a.vehicle_slots, p.max_vehicles_per_subscription)
      )->>'vehicles_per_subscription')::int
    ), 0) AS n
      FROM public.abonnements a
      JOIN public.plans p ON p.id = a.plan_id
     WHERE a.fleet_id = p_fleet_id
       AND public.is_vehicle_subscription_status_active(a.status)
       AND COALESCE(a.starts_at, '-infinity'::timestamptz) <= now()
       AND COALESCE(a.ends_at, 'infinity'::timestamptz) > now()
  ),
  vcnt AS (
    SELECT count(*)::int AS n
      FROM public.vehicules
     WHERE fleet_id = p_fleet_id AND archived_at IS NULL
  )
  SELECT CASE
    WHEN NOT EXISTS (SELECT 1 FROM active_sub) THEN jsonb_build_object(
      'planCode', 'free', 'canCreateVehicle', false, 'canUsePulse', false,
      'canUseQrPremium', false, 'canExportReports', false, 'canUseFinance', false,
      'canAccessMultiFleet', false, 'maxVehicles', 3,
      'vehicleCount', (SELECT n FROM vcnt), 'isActive', false
    )
    ELSE jsonb_build_object(
      'planCode', (SELECT plan_code FROM active_sub),
      'canCreateVehicle', public.can_create_vehicle(p_fleet_id),
      'canUsePulse', (SELECT enables_ai FROM active_sub),
      'canUseQrPremium', (SELECT plan_code IN ('pro','enterprise','organizer') FROM active_sub),
      'canExportReports', (SELECT enables_reports FROM active_sub),
      'canUseFinance', (SELECT enables_finance FROM active_sub),
      'canAccessMultiFleet', (SELECT plan_code IN ('enterprise','organizer') FROM active_sub),
      'maxVehicles', COALESCE(NULLIF((SELECT n FROM total_slots), 0), 3),
      'vehicleCount', (SELECT n FROM vcnt), 'isActive', true,
      'canUseDriverScoring', (SELECT enables_driver_scoring FROM active_sub),
      'canUseAnomalyInsights', (SELECT enables_anomaly_insights FROM active_sub),
      'canUseGeofencing', (SELECT enables_geofencing FROM active_sub),
      'canUseScheduledReports', (SELECT enables_scheduled_reports FROM active_sub),
      'canUseOfflineDriver', (SELECT enables_offline_driver FROM active_sub)
    )
  END INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_plan_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_plan_access(uuid) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
