-- Corrige l'ambiguïté has_role(uuid, unknown) dans get_fleet_billing_context.

CREATE OR REPLACE FUNCTION public.get_fleet_billing_context(p_fleet_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vehicle_count   int;
  v_active_vehicles int;
  v_license_count   int;
  v_sub_id          uuid;
  v_sub_status      text;
  v_plan_code       text;
  v_plan_name       text;
  v_max_vehicles    int;
  v_vehicle_slots   int;
  v_is_paid         boolean;
  v_billing_status  text;
  v_trial_ends_at   timestamptz;
  v_sub_ends_at     timestamptz;
  v_grace_until     timestamptz;
  v_finance         boolean;
  v_ai              boolean;
  v_reports         boolean;
  v_scoring         boolean;
  v_anomaly         boolean;
  v_geofencing      boolean;
  v_scheduled       boolean;
  v_offline         boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  IF NOT (
    public.has_role(p_fleet_id, 'organizer'::role_type)
    OR public.has_role(p_fleet_id, 'manager'::role_type)
    OR public.has_role(p_fleet_id, 'mechanic'::role_type)
    OR public.has_role(p_fleet_id, 'driver'::role_type)
  ) THEN
    RAISE EXCEPTION 'Accès refusé pour cette flotte';
  END IF;

  SELECT COUNT(*)::int
  INTO v_vehicle_count
  FROM public.vehicules v
  WHERE v.fleet_id = p_fleet_id;

  SELECT COUNT(*)::int
  INTO v_active_vehicles
  FROM public.vehicules v
  WHERE v.fleet_id = p_fleet_id
    AND v.status = 'ok';

  SELECT
    a.id,
    a.status,
    p.code,
    p.name,
    p.max_vehicles,
    p.enables_finance,
    p.enables_ai,
    p.enables_reports,
    p.enables_driver_scoring,
    p.enables_anomaly_insights,
    p.enables_geofencing,
    p.enables_scheduled_reports,
    p.enables_offline_driver,
    a.trial_ends_at,
    a.ends_at,
    a.grace_until
  INTO
    v_sub_id,
    v_sub_status,
    v_plan_code,
    v_plan_name,
    v_max_vehicles,
    v_finance,
    v_ai,
    v_reports,
    v_scoring,
    v_anomaly,
    v_geofencing,
    v_scheduled,
    v_offline,
    v_trial_ends_at,
    v_sub_ends_at,
    v_grace_until
  FROM public.abonnements a
  INNER JOIN public.plans p ON p.id = a.plan_id
  WHERE a.fleet_id = p_fleet_id
    AND a.status IN ('trial', 'active', 'grace_period', 'suspended', 'pending_payment')
  ORDER BY a.ends_at DESC
  LIMIT 1;

  IF v_plan_code IS NULL THEN
    SELECT
      pf.name,
      pf.max_vehicles,
      pf.enables_finance,
      pf.enables_ai,
      pf.enables_reports,
      pf.enables_driver_scoring,
      pf.enables_anomaly_insights,
      pf.enables_geofencing,
      pf.enables_scheduled_reports,
      pf.enables_offline_driver
    INTO
      v_plan_name,
      v_max_vehicles,
      v_finance,
      v_ai,
      v_reports,
      v_scoring,
      v_anomaly,
      v_geofencing,
      v_scheduled,
      v_offline
    FROM public.plans pf
    WHERE pf.code = 'free'
    LIMIT 1;

    v_plan_code      := 'free';
    v_is_paid        := false;
    v_billing_status := 'trial';
    v_sub_status     := NULL;
    v_sub_id         := NULL;
    v_trial_ends_at  := NULL;
    v_sub_ends_at    := NULL;
    v_grace_until    := NULL;
  ELSE
    v_is_paid := v_plan_code <> 'free';

    IF v_plan_code = 'free' THEN
      v_max_vehicles := COALESCE(v_max_vehicles, 3);
      v_finance      := false;
      v_ai           := false;
      v_reports      := false;
      v_scoring      := false;
      v_anomaly      := false;
      v_geofencing   := false;
      v_scheduled    := false;
      v_offline      := COALESCE(v_offline, false);
    ELSE
      v_finance    := COALESCE(v_finance, true);
      v_ai         := COALESCE(v_ai, true);
      v_reports    := COALESCE(v_reports, true);
      v_scoring    := COALESCE(v_scoring, true);
      v_anomaly    := COALESCE(v_anomaly, true);
      v_geofencing := COALESCE(v_geofencing, false);
      v_scheduled  := COALESCE(v_scheduled, false);
      v_offline    := COALESCE(v_offline, true);
    END IF;

    v_billing_status := CASE
      WHEN v_plan_code = 'enterprise'
        AND v_sub_status IN ('active', 'trial', 'grace_period')
        THEN 'enterprise'
      WHEN v_sub_status = 'grace_period' THEN 'grace'
      WHEN v_sub_status = 'suspended'     THEN 'suspended'
      WHEN v_sub_status = 'trial'         THEN 'trial'
      WHEN v_sub_status = 'pending_payment' THEN 'trial'
      WHEN v_sub_status = 'active'        THEN 'active'
      ELSE 'trial'
    END;
  END IF;

  v_license_count := 0;
  IF v_sub_id IS NOT NULL THEN
    SELECT COUNT(*)::int
    INTO v_license_count
    FROM public.droits_vehicules dv
    WHERE dv.subscription_id = v_sub_id
      AND dv.active = true
      AND dv.status = 'active'
      AND dv.starts_at <= now()
      AND dv.ends_at >= now();
  END IF;

  v_vehicle_slots := COALESCE(
    NULLIF(v_license_count, 0),
    v_max_vehicles,
    3
  );

  RETURN jsonb_build_object(
    'plan_code',                    v_plan_code,
    'plan_name',                    COALESCE(v_plan_name, v_plan_code),
    'is_paid',                      v_is_paid,
    'vehicle_count',                v_vehicle_count,
    'active_vehicles',              v_active_vehicles,
    'vehicle_slots',                COALESCE(v_vehicle_slots, 999999),
    'max_vehicles',                 COALESCE(v_max_vehicles, 999999),
    'billing_status',               v_billing_status,
    'trial_ends_at',                v_trial_ends_at,
    'subscription_ends_at',         v_sub_ends_at,
    'grace_until',                  v_grace_until,
    'finance_enabled',              v_finance,
    'ai_enabled',                   v_ai,
    'reports_enabled',              v_reports,
    'driver_scoring_enabled',       v_scoring,
    'anomaly_insights_enabled',     v_anomaly,
    'geofencing_enabled',           v_geofencing,
    'scheduled_reports_enabled',    v_scheduled,
    'offline_driver_enabled',       v_offline
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_fleet_billing_context(uuid) TO authenticated;
