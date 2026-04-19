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
AS $$
DECLARE
  v_ctx public.fleet_billing_context;
BEGIN
  -- Service-role context (seed / admin tools): no JWT → skip limit check
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT public.get_fleet_billing_context(NEW.fleet_id) INTO v_ctx;

  IF v_ctx.vehicle_count >= v_ctx.vehicle_limit THEN
    RAISE EXCEPTION
      'Limite de véhicules atteinte pour cette flotte (plan: %, limite: %)',
      v_ctx.plan_code,
      v_ctx.vehicle_limit
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;
