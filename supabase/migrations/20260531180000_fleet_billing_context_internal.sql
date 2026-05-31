-- Contexte billing interne pour triggers / SQL Editor (sans auth.uid).
-- get_fleet_billing_context(uuid) reste réservé au frontend (auth + rôles flotte).

BEGIN;

CREATE OR REPLACE FUNCTION public.get_fleet_billing_context_internal(p_fleet_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id          uuid;
  v_vehicle_count   int;
  v_active_vehicles int;
  v_license_count   int;
  v_sub_id          uuid;
  v_plan_code       text;
  v_max_vehicles    int;
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

  SELECT a.id, p.code, p.max_vehicles
  INTO v_sub_id, v_plan_code, v_max_vehicles
  FROM public.abonnements a
  INNER JOIN public.plans p ON p.id = a.plan_id
  WHERE a.fleet_id = p_fleet_id
    AND a.status IN ('trial', 'active', 'grace_period', 'suspended', 'pending_payment')
  ORDER BY a.ends_at DESC
  LIMIT 1;

  IF v_plan_code IS NULL THEN
    SELECT pf.max_vehicles
    INTO v_max_vehicles
    FROM public.plans pf
    WHERE pf.code = 'free'
    LIMIT 1;

    v_plan_code := 'free';
    v_max_vehicles := COALESCE(v_max_vehicles, 3);
  ELSIF v_plan_code = 'free' THEN
    v_max_vehicles := COALESCE(v_max_vehicles, 3);
  ELSE
    v_max_vehicles := COALESCE(v_max_vehicles, 999999);
  END IF;

  IF v_sub_id IS NOT NULL THEN
    SELECT COUNT(*)::int
    INTO v_license_count
    FROM public.droits_vehicules dv
    WHERE dv.subscription_id = v_sub_id
      AND dv.active = true
      AND dv.status = 'active'
      AND dv.starts_at <= now()
      AND dv.ends_at >= now();
  ELSE
    v_license_count := 0;
  END IF;

  IF v_license_count > 0 THEN
    v_max_vehicles := v_license_count;
  END IF;

  RETURN jsonb_build_object(
    'fleet_id',        p_fleet_id,
    'org_id',          v_org_id,
    'plan_code',       v_plan_code,
    'max_vehicles',    COALESCE(v_max_vehicles, 999999),
    'vehicle_count',   v_vehicle_count,
    'active_vehicles', v_active_vehicles
  );
END;
$$;

COMMENT ON FUNCTION public.get_fleet_billing_context_internal(uuid) IS
  'Contexte billing serveur (triggers, migrations). Pas d''auth.uid() ; ne pas exposer au frontend.';

REVOKE ALL ON FUNCTION public.get_fleet_billing_context_internal(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_fleet_billing_context_internal(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_fleet_billing_context_internal(uuid) FROM authenticated;

CREATE OR REPLACE FUNCTION public.trg_enforce_fleet_vehicle_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ctx jsonb;
  v_max int;
  v_cnt int;
BEGIN
  SELECT public.get_fleet_billing_context_internal(NEW.fleet_id) INTO v_ctx;

  v_max := COALESCE((v_ctx->>'max_vehicles')::int, 999999);
  v_cnt := COALESCE((v_ctx->>'vehicle_count')::int, 0);

  IF v_max >= 999999 THEN
    RETURN NEW;
  END IF;

  IF v_cnt + 1 > v_max THEN
    RAISE EXCEPTION 'limite_vehicules_plan_atteinte'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trg_enforce_fleet_vehicle_limit() IS
  'Plafond véhicules via get_fleet_billing_context_internal (sans JWT).';

NOTIFY pgrst, 'reload schema';

COMMIT;
