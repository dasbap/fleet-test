-- Restore runtime RPC used after driver shift closure.
-- The frontend calls public.calculer_recette_attendue(p_shift_id) after fermer_creneau.

ALTER TABLE public.clotures_creneaux
  ADD COLUMN IF NOT EXISTS expected_revenue int,
  ADD COLUMN IF NOT EXISTS revenue_gap int;

CREATE OR REPLACE FUNCTION public.calculer_recette_attendue(
  p_shift_id uuid
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expected_revenue int;
  v_driver_user_id uuid;
  v_fleet_id uuid;
  v_km_start int;
  v_km_end int;
  v_km_total int;
  v_avg_revenue_per_km numeric;
BEGIN
  SELECT
    a.driver_user_id,
    a.fleet_id,
    c.km_start,
    c.km_end
  INTO v_driver_user_id, v_fleet_id, v_km_start, v_km_end
  FROM public.creneaux_conducteurs c
  JOIN public.affectations_vehicules a ON a.id = c.assignment_id
  WHERE c.id = p_shift_id;

  IF NOT FOUND OR v_km_end IS NULL OR v_km_start IS NULL THEN
    RETURN NULL;
  END IF;

  v_km_total := GREATEST(v_km_end - v_km_start, 0);

  SELECT
    CASE
      WHEN SUM(c.km_end - c.km_start) > 0
      THEN SUM(cc.revenue_declared)::numeric / SUM(c.km_end - c.km_start)::numeric
      ELSE 0
    END
  INTO v_avg_revenue_per_km
  FROM public.creneaux_conducteurs c
  JOIN public.affectations_vehicules a ON a.id = c.assignment_id
  JOIN public.clotures_creneaux cc ON cc.shift_id = c.id
  WHERE a.driver_user_id = v_driver_user_id
    AND a.fleet_id = v_fleet_id
    AND c.status = 'closed'
    AND cc.status = 'validated'
    AND c.ended_at >= now() - interval '30 days'
    AND c.km_end IS NOT NULL
    AND c.km_start IS NOT NULL
    AND (c.km_end - c.km_start) > 0;

  IF v_avg_revenue_per_km IS NULL OR v_avg_revenue_per_km = 0 THEN
    v_avg_revenue_per_km := 100;
  END IF;

  v_expected_revenue := (v_km_total * v_avg_revenue_per_km)::int;

  UPDATE public.clotures_creneaux
  SET
    expected_revenue = v_expected_revenue,
    revenue_gap = revenue_declared - v_expected_revenue
  WHERE shift_id = p_shift_id;

  RETURN v_expected_revenue;
END;
$$;

GRANT EXECUTE ON FUNCTION public.calculer_recette_attendue(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
