BEGIN;

-- RPC dédiée aux tops scores conducteurs :
-- - tri garanti côté base
-- - limite bornée côté SQL
-- - contrôle d'accès centralisé
CREATE OR REPLACE FUNCTION public.get_top_driver_scores(
  p_fleet_id uuid,
  p_limit int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  driver_user_id uuid,
  fleet_id uuid,
  score_level public.driver_score_level,
  financial_score numeric,
  score_total numeric,
  incidents_score numeric,
  closure_delay_score numeric,
  shift_discipline_score numeric,
  operational_stability_score numeric,
  model_version text,
  model_metadata jsonb,
  last_calculated_at timestamptz,
  created_at timestamptz,
  driver jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  IF NOT (
    public.has_role(p_fleet_id, 'organizer')
    OR public.has_role(p_fleet_id, 'manager')
    OR public.has_role(p_fleet_id, 'mechanic')
    OR public.has_role(p_fleet_id, 'driver')
  ) THEN
    RAISE EXCEPTION 'Accès refusé pour cette flotte';
  END IF;

  v_limit := LEAST(GREATEST(COALESCE(p_limit, 5), 1), 100);

  RETURN QUERY
  SELECT
    sc.id,
    sc.driver_user_id,
    sc.fleet_id,
    sc.score_level,
    sc.financial_score,
    sc.score_total,
    sc.incidents_score,
    sc.closure_delay_score,
    sc.shift_discipline_score,
    sc.operational_stability_score,
    sc.model_version,
    sc.model_metadata,
    sc.last_calculated_at,
    sc.created_at,
    jsonb_build_object(
      'user_id', p.user_id,
      'full_name', p.full_name
    ) AS driver
  FROM public.scores_conducteurs sc
  LEFT JOIN public.profils p ON p.user_id = sc.driver_user_id
  WHERE sc.fleet_id = p_fleet_id
  ORDER BY
    sc.score_total DESC NULLS LAST,
    sc.last_calculated_at DESC,
    sc.created_at DESC
  LIMIT v_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_top_driver_scores(uuid, int) TO authenticated;

COMMENT ON FUNCTION public.get_top_driver_scores(uuid, int) IS
  'Retourne les meilleurs scores conducteurs pour une flotte avec tri garanti en base et limite bornée.';

COMMIT;
