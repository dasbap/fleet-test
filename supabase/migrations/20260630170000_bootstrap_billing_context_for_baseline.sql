-- Bootstrap idempotent du contexte billing pour les bases issues de la baseline squash.
-- Version compatible avec le schema baseline minimal (sans colonnes lifecycle avancees).

BEGIN;

CREATE OR REPLACE FUNCTION public.get_fleet_billing_context_internal(p_fleet_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_vehicle_count int;
  v_active_vehicles int;
  v_sub_id uuid;
  v_plan_code text := 'free';
  v_max_vehicles int := 3;
  v_license_count int := 0;
BEGIN
  SELECT f.org_id
  INTO v_org_id
  FROM public.flottes f
  WHERE f.id = p_fleet_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'flotte_introuvable'
      USING ERRCODE = 'P0001';
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

  SELECT a.id, COALESCE(p.code, 'free')
  INTO v_sub_id, v_plan_code
  FROM public.abonnements a
  INNER JOIN public.plans p ON p.id = a.plan_id
  WHERE a.fleet_id = p_fleet_id
  ORDER BY a.ends_at DESC
  LIMIT 1;

  v_plan_code := lower(COALESCE(v_plan_code, 'free'));
  v_max_vehicles := CASE v_plan_code
    WHEN 'free' THEN 3
    WHEN 'starter' THEN 10
    WHEN 'pro' THEN 50
    WHEN 'enterprise' THEN 999999
    WHEN 'organizer' THEN 999999
    ELSE CASE WHEN v_plan_code = 'free' THEN 3 ELSE 999999 END
  END;

  IF v_sub_id IS NOT NULL THEN
    SELECT COUNT(*)::int
    INTO v_license_count
    FROM public.droits_vehicules dv
    WHERE dv.subscription_id = v_sub_id
      AND dv.active = true;
  END IF;

  IF v_license_count > 0 THEN
    v_max_vehicles := v_license_count;
  END IF;

  RETURN jsonb_build_object(
    'fleet_id', p_fleet_id,
    'org_id', v_org_id,
    'plan_code', v_plan_code,
    'max_vehicles', COALESCE(v_max_vehicles, 999999),
    'vehicle_count', COALESCE(v_vehicle_count, 0),
    'active_vehicles', COALESCE(v_active_vehicles, 0)
  );
END;
$$;

COMMENT ON FUNCTION public.get_fleet_billing_context_internal(uuid) IS
  'Contexte billing serveur minimal compatible baseline. Pas expose au frontend.';

REVOKE ALL ON FUNCTION public.get_fleet_billing_context_internal(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_fleet_billing_context_internal(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_fleet_billing_context_internal(uuid) FROM authenticated;

CREATE OR REPLACE FUNCTION public.get_fleet_billing_context(p_fleet_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base jsonb;
  v_vehicle_count int;
  v_active_vehicles int;
  v_sub_id uuid;
  v_sub_status text;
  v_sub_starts_at timestamptz;
  v_sub_ends_at timestamptz;
  v_plan_code text := 'free';
  v_plan_name text := 'Gratuit';
  v_max_vehicles int := 3;
  v_vehicle_slots int := 3;
  v_license_count int := 0;
  v_is_paid boolean := false;
  v_billing_status text := 'trial';
  v_finance boolean := false;
  v_ai boolean := false;
  v_reports boolean := false;
  v_scoring boolean := false;
  v_anomaly boolean := false;
  v_geofencing boolean := false;
  v_scheduled boolean := false;
  v_offline boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'non_authentifie';
  END IF;

  IF NOT (
    public.has_role(p_fleet_id, 'organizer'::public.role_type)
    OR public.has_role(p_fleet_id, 'manager'::public.role_type)
    OR public.has_role(p_fleet_id, 'mechanic'::public.role_type)
    OR public.has_role(p_fleet_id, 'driver'::public.role_type)
  ) THEN
    RAISE EXCEPTION 'acces_refuse_flotte';
  END IF;

  v_base := public.get_fleet_billing_context_internal(p_fleet_id);
  v_vehicle_count := COALESCE((v_base->>'vehicle_count')::int, 0);
  v_active_vehicles := COALESCE((v_base->>'active_vehicles')::int, 0);

  SELECT
    a.id,
    a.status,
    a.starts_at,
    a.ends_at,
    COALESCE(p.code, 'free'),
    COALESCE(p.name, 'Gratuit')
  INTO
    v_sub_id,
    v_sub_status,
    v_sub_starts_at,
    v_sub_ends_at,
    v_plan_code,
    v_plan_name
  FROM public.abonnements a
  INNER JOIN public.plans p ON p.id = a.plan_id
  WHERE a.fleet_id = p_fleet_id
  ORDER BY a.ends_at DESC
  LIMIT 1;

  v_plan_code := lower(COALESCE(v_plan_code, 'free'));
  v_plan_name := COALESCE(v_plan_name, CASE v_plan_code
    WHEN 'free' THEN 'Gratuit'
    WHEN 'starter' THEN 'Starter'
    WHEN 'pro' THEN 'Pro'
    WHEN 'enterprise' THEN 'Enterprise'
    ELSE v_plan_code
  END);

  v_max_vehicles := CASE v_plan_code
    WHEN 'free' THEN 3
    WHEN 'starter' THEN 10
    WHEN 'pro' THEN 50
    WHEN 'enterprise' THEN 999999
    WHEN 'organizer' THEN 999999
    ELSE CASE WHEN v_plan_code = 'free' THEN 3 ELSE 999999 END
  END;

  v_is_paid := v_plan_code <> 'free';

  IF v_sub_id IS NOT NULL THEN
    SELECT COUNT(*)::int
    INTO v_license_count
    FROM public.droits_vehicules dv
    WHERE dv.subscription_id = v_sub_id
      AND dv.active = true;
  END IF;

  IF v_license_count > 0 THEN
    v_max_vehicles := v_license_count;
  END IF;

  v_vehicle_slots := COALESCE(NULLIF(v_license_count, 0), v_max_vehicles, 3);

  IF NOT v_is_paid THEN
    v_billing_status := 'trial';
  ELSIF v_plan_code = 'enterprise'
    AND v_sub_status = 'active'
    AND v_sub_starts_at <= now()
    AND v_sub_ends_at >= now() THEN
    v_billing_status := 'enterprise';
  ELSIF v_sub_status IN ('grace', 'grace_period') THEN
    v_billing_status := 'grace';
  ELSIF v_sub_status = 'active'
    AND v_sub_starts_at <= now()
    AND v_sub_ends_at >= now() THEN
    v_billing_status := 'active';
  ELSIF v_sub_status = 'trial' THEN
    v_billing_status := 'trial';
  ELSE
    v_billing_status := 'suspended';
  END IF;

  v_finance := v_is_paid;
  v_ai := v_is_paid;
  v_reports := v_is_paid;
  v_scoring := v_is_paid;
  v_anomaly := v_is_paid;
  v_geofencing := v_plan_code IN ('pro', 'enterprise', 'organizer');
  v_scheduled := v_plan_code IN ('pro', 'enterprise', 'organizer');
  v_offline := v_is_paid;

  RETURN jsonb_build_object(
    'plan_code', v_plan_code,
    'plan_name', v_plan_name,
    'is_paid', v_is_paid,
    'vehicle_count', v_vehicle_count,
    'active_vehicles', v_active_vehicles,
    'vehicle_slots', COALESCE(v_vehicle_slots, 999999),
    'max_vehicles', COALESCE(v_max_vehicles, 999999),
    'billing_status', v_billing_status,
    'trial_ends_at', CASE WHEN v_billing_status = 'trial' THEN v_sub_ends_at ELSE NULL END,
    'subscription_ends_at', CASE WHEN v_is_paid THEN v_sub_ends_at ELSE NULL END,
    'grace_until', NULL,
    'finance_enabled', v_finance,
    'ai_enabled', v_ai,
    'reports_enabled', v_reports,
    'driver_scoring_enabled', v_scoring,
    'anomaly_insights_enabled', v_anomaly,
    'geofencing_enabled', v_geofencing,
    'scheduled_reports_enabled', v_scheduled,
    'offline_driver_enabled', v_offline
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_fleet_billing_context(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_fleet_billing_context(uuid) FROM anon;

COMMENT ON FUNCTION public.get_fleet_billing_context(uuid) IS
  'Contexte billing frontend minimal compatible baseline.';

NOTIFY pgrst, 'reload schema';

COMMIT;
