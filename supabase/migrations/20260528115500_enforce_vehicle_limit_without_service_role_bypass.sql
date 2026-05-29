-- Renforce le guard serveur maxVehicles.
-- Objectif : empêcher le contournement via contexte service_role (auth.uid() IS NULL).
-- Le guard doit s'appliquer à toute insertion de véhicule, quelle que soit la provenance.

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
