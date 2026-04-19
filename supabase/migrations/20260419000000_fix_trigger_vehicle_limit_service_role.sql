-- Migration: fix trg_enforce_fleet_vehicle_limit for service-role context
-- Problem: when seed scripts or admin tools insert vehicles via the Supabase
--          service role, auth.uid() returns NULL, causing get_fleet_billing_context
--          to raise "Non authentifié" and block the insert.
-- Fix: early return when auth.uid() is NULL (service-role / postgres context).
--      This is safe because service-role callers bypass RLS anyway.

CREATE OR REPLACE FUNCTION public.trg_enforce_fleet_vehicle_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_ctx jsonb;
  v_max int;
  v_cnt int;
BEGIN
  -- Service-role context (seed / admin tools): no JWT → skip limit check
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT public.get_fleet_billing_context(NEW.fleet_id) INTO v_ctx;
  v_max := COALESCE((v_ctx->>'max_vehicles')::int, 999999);

  IF v_max >= 999999 THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*)::int INTO v_cnt FROM public.vehicules WHERE fleet_id = NEW.fleet_id;

  IF v_cnt + 1 > v_max THEN
    RAISE EXCEPTION 'limite_vehicules_plan_atteinte';
  END IF;

  RETURN NEW;
END;
$$;
