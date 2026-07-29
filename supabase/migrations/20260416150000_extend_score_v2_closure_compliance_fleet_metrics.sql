BEGIN;

-- =============================================================================
-- 1) Scoring : référence unique = calculer_score_conducteur_v2
--    Ajout des pénalités « clôtures sans preuve » + « écarts recette injustifiés »
--    (aligné sur la logique métier de l'ancien calculer_score_conducteur v1 pour
--    les écarts), avec plafond de pénalité pour ne pas écraser le score hybride.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.calculer_score_conducteur_v2(
  p_driver_user_id uuid,
  p_fleet_id uuid,
  p_model_version text DEFAULT 'v1-hybrid'
)
RETURNS public.driver_score_level
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_incident_count int := 0;
  v_weighted_incidents numeric := 0;
  v_incidents_score numeric(5,2) := 100;
  v_shift_closed_count int := 0;
  v_shift_pending_count int := 0;
  v_shift_discipline_score numeric(5,2) := 100;
  v_avg_resolution_hours numeric := 0;
  v_closure_delay_score numeric(5,2) := 100;
  v_operational_stability_score numeric(5,2) := 80;
  v_score_total numeric(5,2);
  v_score_level public.driver_score_level;
  v_meta jsonb;
  v_missed_no_proof int := 0;
  v_unjustified_gap_count int := 0;
  v_penalty numeric(5,2) := 0;
BEGIN
  SELECT
    COUNT(*)::int,
    COALESCE(SUM(
      CASE i.severity
        WHEN 'critical' THEN 8
        WHEN 'high' THEN 5
        WHEN 'medium' THEN 3
        ELSE 1
      END
    ), 0)::numeric
  INTO v_incident_count, v_weighted_incidents
  FROM public.incidents i
  JOIN public.vehicules v ON v.id = i.vehicle_id
  WHERE i.driver_user_id = p_driver_user_id
    AND v.fleet_id = p_fleet_id
    AND i.created_at >= now() - interval '30 days';

  v_incidents_score := GREATEST(0, LEAST(100, 100 - (v_weighted_incidents * 4)));

  SELECT
    COUNT(*) FILTER (WHERE c.status = 'closed')::int,
    COUNT(*) FILTER (WHERE cc.status = 'pending')::int
  INTO v_shift_closed_count, v_shift_pending_count
  FROM public.creneaux_conducteurs c
  JOIN public.affectations_vehicules a ON a.id = c.assignment_id
  LEFT JOIN public.clotures_creneaux cc ON cc.shift_id = c.id
  WHERE a.driver_user_id = p_driver_user_id
    AND a.fleet_id = p_fleet_id
    AND c.started_at >= now() - interval '30 days';

  v_shift_discipline_score := CASE
    WHEN v_shift_closed_count = 0 THEN 80
    ELSE GREATEST(0, LEAST(100, 100 - ((v_shift_pending_count::numeric / v_shift_closed_count::numeric) * 100)))
  END;

  SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (i.resolved_at - i.created_at)) / 3600), 0)::numeric
  INTO v_avg_resolution_hours
  FROM public.incidents i
  JOIN public.vehicules v ON v.id = i.vehicle_id
  WHERE i.driver_user_id = p_driver_user_id
    AND v.fleet_id = p_fleet_id
    AND i.resolved_at IS NOT NULL
    AND i.created_at >= now() - interval '30 days';

  v_closure_delay_score := CASE
    WHEN v_avg_resolution_hours = 0 THEN 80
    WHEN v_avg_resolution_hours <= 12 THEN 100
    WHEN v_avg_resolution_hours <= 24 THEN 85
    WHEN v_avg_resolution_hours <= 48 THEN 70
    ELSE 50
  END;

  SELECT CASE
      WHEN COUNT(*) FILTER (WHERE cc.status = 'validated') = 0 THEN 60
      WHEN COUNT(*) FILTER (WHERE cc.status = 'validated') >= 15 THEN 100
      WHEN COUNT(*) FILTER (WHERE cc.status = 'validated') >= 8 THEN 85
      ELSE 72
    END::numeric(5,2)
  INTO v_operational_stability_score
  FROM public.creneaux_conducteurs c
  JOIN public.affectations_vehicules a ON a.id = c.assignment_id
  LEFT JOIN public.clotures_creneaux cc ON cc.shift_id = c.id
  WHERE a.driver_user_id = p_driver_user_id
    AND a.fleet_id = p_fleet_id
    AND c.started_at >= now() - interval '30 days';

  v_score_total := ROUND(
    (v_incidents_score * 0.35)
    + (v_closure_delay_score * 0.25)
    + (v_shift_discipline_score * 0.25)
    + (v_operational_stability_score * 0.15),
    2
  );

  -- Clôtures en attente sans preuve exploitable (équivalent « proof_provided = false »)
  SELECT COUNT(*)::int
  INTO v_missed_no_proof
  FROM public.clotures_creneaux cc
  JOIN public.creneaux_conducteurs c ON c.id = cc.shift_id
  JOIN public.affectations_vehicules a ON a.id = c.assignment_id
  WHERE a.driver_user_id = p_driver_user_id
    AND a.fleet_id = p_fleet_id
    AND cc.created_at >= now() - interval '30 days'
    AND cc.status = 'pending'::public.closure_status
    AND btrim(cc.proof_value) = '';

  -- Écarts recette significatifs sur clôtures validées (cohérent avec calculer_score_conducteur v1)
  SELECT COUNT(*)::int
  INTO v_unjustified_gap_count
  FROM public.clotures_creneaux cc
  JOIN public.creneaux_conducteurs c ON c.id = cc.shift_id
  JOIN public.affectations_vehicules a ON a.id = c.assignment_id
  WHERE a.driver_user_id = p_driver_user_id
    AND a.fleet_id = p_fleet_id
    AND cc.created_at >= now() - interval '30 days'
    AND cc.status = 'validated'::public.closure_status
    AND cc.revenue_gap IS NOT NULL
    AND cc.revenue_gap < 0
    AND cc.expected_revenue IS NOT NULL
    AND cc.expected_revenue > 0
    AND ABS(cc.revenue_gap) > (cc.expected_revenue * 0.1);

  v_penalty := LEAST(
    20::numeric,
    (v_missed_no_proof::numeric * 2.0) + (v_unjustified_gap_count::numeric * 2.5)
  );

  v_score_total := ROUND(
    GREATEST(0::numeric, LEAST(100::numeric, v_score_total - v_penalty)),
    2
  );

  IF v_score_total >= 80 THEN
    v_score_level := 'green';
  ELSIF v_score_total >= 60 THEN
    v_score_level := 'orange';
  ELSE
    v_score_level := 'red';
  END IF;

  v_meta := jsonb_build_object(
    'window_days', 30,
    'incident_count', v_incident_count,
    'weighted_incidents', v_weighted_incidents,
    'avg_resolution_hours', v_avg_resolution_hours,
    'shift_closed_count', v_shift_closed_count,
    'shift_pending_count', v_shift_pending_count,
    'missed_closure_without_proof_count', v_missed_no_proof,
    'unjustified_revenue_gap_count', v_unjustified_gap_count,
    'closure_compliance_penalty', v_penalty
  );

  INSERT INTO public.scores_conducteurs (
    driver_user_id,
    fleet_id,
    score_level,
    financial_score,
    score_total,
    incidents_score,
    closure_delay_score,
    shift_discipline_score,
    operational_stability_score,
    model_version,
    model_metadata,
    last_calculated_at
  )
  VALUES (
    p_driver_user_id,
    p_fleet_id,
    v_score_level,
    v_score_total,
    v_score_total,
    v_incidents_score,
    v_closure_delay_score,
    v_shift_discipline_score,
    v_operational_stability_score,
    p_model_version,
    v_meta,
    now()
  )
  ON CONFLICT (driver_user_id, fleet_id)
  DO UPDATE SET
    score_level = EXCLUDED.score_level,
    financial_score = EXCLUDED.financial_score,
    score_total = EXCLUDED.score_total,
    incidents_score = EXCLUDED.incidents_score,
    closure_delay_score = EXCLUDED.closure_delay_score,
    shift_discipline_score = EXCLUDED.shift_discipline_score,
    operational_stability_score = EXCLUDED.operational_stability_score,
    model_version = EXCLUDED.model_version,
    model_metadata = EXCLUDED.model_metadata,
    last_calculated_at = EXCLUDED.last_calculated_at;

  INSERT INTO public.driver_score_snapshots (
    fleet_id,
    driver_user_id,
    score_level,
    score_total,
    incidents_score,
    closure_delay_score,
    shift_discipline_score,
    operational_stability_score,
    model_version,
    model_metadata,
    calculated_at
  )
  VALUES (
    p_fleet_id,
    p_driver_user_id,
    v_score_level,
    v_score_total,
    v_incidents_score,
    v_closure_delay_score,
    v_shift_discipline_score,
    v_operational_stability_score,
    p_model_version,
    v_meta,
    now()
  );

  RETURN v_score_level;
END;
$$;

-- =============================================================================
-- 2) Métriques d'activation par flotte (cohérentes avec le domaine métier local)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.fleet_activation_metrics(p_fleet_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_signup int;
  v_act_d1 int;
  v_act_d7 int;
  v_closures_7d int;
  v_active_drivers_7d int;
  v_daily_closure_rate numeric;
  v_proof_rate numeric;
  v_blocked int;
  v_avg_score numeric;
  v_total_closures_30d int;
  v_with_proof int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  IF NOT (
    public.has_role(p_fleet_id, 'organizer'::public.role_type)
    OR public.has_role(p_fleet_id, 'manager'::public.role_type)
    OR public.has_role(p_fleet_id, 'mechanic'::public.role_type)
    OR public.has_role(p_fleet_id, 'driver'::public.role_type)
  ) THEN
    RAISE EXCEPTION 'Accès refusé pour cette flotte';
  END IF;

  -- Inscriptions conducteurs (fenêtre 30 jours)
  SELECT COUNT(*)::int
  INTO v_signup
  FROM public.flotte_adhesions fa
  WHERE fa.fleet_id = p_fleet_id
    AND fa.role = 'driver'::public.role_type
    AND fa.is_active = true
    AND fa.created_at >= now() - interval '30 days';

  -- Activation J1 / J7 : parmi les adhésions conducteurs des 30 derniers jours, premier créneau ou clôture
  WITH base AS (
    SELECT fa.user_id, fa.created_at AS joined_at
    FROM public.flotte_adhesions fa
    WHERE fa.fleet_id = p_fleet_id
      AND fa.role = 'driver'::public.role_type
      AND fa.is_active = true
      AND fa.created_at >= now() - interval '30 days'
  ),
  first_ts AS (
    SELECT
      b.user_id,
      b.joined_at,
      (
        SELECT MIN(ts)
        FROM (
          SELECT c.started_at AS ts
          FROM public.creneaux_conducteurs c
          INNER JOIN public.affectations_vehicules a ON a.id = c.assignment_id
          WHERE a.fleet_id = p_fleet_id
            AND a.driver_user_id = b.user_id
          UNION ALL
          SELECT cl.created_at AS ts
          FROM public.clotures_creneaux cl
          INNER JOIN public.creneaux_conducteurs c ON c.id = cl.shift_id
          INNER JOIN public.affectations_vehicules a ON a.id = c.assignment_id
          WHERE a.fleet_id = p_fleet_id
            AND a.driver_user_id = b.user_id
        ) u
      ) AS first_activity_at
    FROM base b
  )
  SELECT
    COUNT(*) FILTER (
      WHERE first_activity_at IS NOT NULL
        AND first_activity_at <= joined_at + interval '1 day'
    )::int,
    COUNT(*) FILTER (
      WHERE first_activity_at IS NOT NULL
        AND first_activity_at <= joined_at + interval '7 days'
    )::int
  INTO v_act_d1, v_act_d7
  FROM first_ts;

  SELECT COUNT(*)::int
  INTO v_closures_7d
  FROM public.clotures_creneaux cl
  INNER JOIN public.creneaux_conducteurs c ON c.id = cl.shift_id
  INNER JOIN public.affectations_vehicules a ON a.id = c.assignment_id
  WHERE a.fleet_id = p_fleet_id
    AND cl.created_at >= now() - interval '7 days';

  SELECT COUNT(DISTINCT a.driver_user_id)::int
  INTO v_active_drivers_7d
  FROM public.creneaux_conducteurs c
  INNER JOIN public.affectations_vehicules a ON a.id = c.assignment_id
  WHERE a.fleet_id = p_fleet_id
    AND c.started_at >= now() - interval '7 days';

  v_daily_closure_rate := ROUND(
    (v_closures_7d::numeric / 7.0) / NULLIF(GREATEST(v_active_drivers_7d, 1), 0)::numeric,
    4
  );

  SELECT COUNT(*)::int, COUNT(*) FILTER (WHERE btrim(cl.proof_value) <> '')::int
  INTO v_total_closures_30d, v_with_proof
  FROM public.clotures_creneaux cl
  INNER JOIN public.creneaux_conducteurs c ON c.id = cl.shift_id
  INNER JOIN public.affectations_vehicules a ON a.id = c.assignment_id
  WHERE a.fleet_id = p_fleet_id
    AND cl.created_at >= now() - interval '30 days';

  v_proof_rate := CASE
    WHEN v_total_closures_30d = 0 THEN 0::numeric
    ELSE ROUND(100.0 * v_with_proof::numeric / v_total_closures_30d::numeric, 2)
  END;

  SELECT COUNT(*)::int
  INTO v_blocked
  FROM public.flotte_adhesions fa
  WHERE fa.fleet_id = p_fleet_id
    AND fa.role = 'driver'::public.role_type
    AND fa.is_active = false;

  SELECT ROUND(AVG(sc.score_total)::numeric, 2)
  INTO v_avg_score
  FROM public.scores_conducteurs sc
  WHERE sc.fleet_id = p_fleet_id
    AND sc.score_total IS NOT NULL;

  RETURN jsonb_build_object(
    'signup_count', v_signup,
    'activated_day1', COALESCE(v_act_d1, 0),
    'activated_day7', COALESCE(v_act_d7, 0),
    'daily_closure_rate', COALESCE(v_daily_closure_rate, 0),
    'proof_submission_rate', COALESCE(v_proof_rate, 0),
    'blocked_drivers_count', COALESCE(v_blocked, 0),
    'average_driver_score', COALESCE(v_avg_score, 0)
  );
END;
$$;

COMMENT ON FUNCTION public.fleet_activation_metrics(uuid) IS
  'Métriques d''activation et qualité pour une flotte : aligné sur clotures_creneaux et scores_conducteurs.';

REVOKE ALL ON FUNCTION public.fleet_activation_metrics(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fleet_activation_metrics(uuid) TO authenticated;

COMMIT;
