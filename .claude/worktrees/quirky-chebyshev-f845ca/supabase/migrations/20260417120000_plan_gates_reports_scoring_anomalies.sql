-- =====================================================
-- Plans : rapports, scoring conducteur, analyse / alertes anomalies
-- Extension get_fleet_billing_context + garde-fous RPC
-- =====================================================

BEGIN;

ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS enables_reports boolean NOT NULL DEFAULT true;

ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS enables_driver_scoring boolean NOT NULL DEFAULT true;

ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS enables_anomaly_insights boolean NOT NULL DEFAULT true;

-- Plan gratuit : pas de rapports détaillés, pas de scoring, pas d’alertes auto (anomalies)
INSERT INTO public.plans (
  code,
  name,
  price_per_vehicle,
  min_commitment_days,
  is_active,
  max_vehicles,
  enables_finance,
  enables_ai,
  enables_reports,
  enables_driver_scoring,
  enables_anomaly_insights
)
VALUES (
  'free',
  'Gratuit',
  0,
  0,
  true,
  3,
  false,
  false,
  false,
  false,
  false
)
ON CONFLICT (code) DO UPDATE SET
  max_vehicles = EXCLUDED.max_vehicles,
  enables_finance = EXCLUDED.enables_finance,
  enables_ai = EXCLUDED.enables_ai,
  enables_reports = EXCLUDED.enables_reports,
  enables_driver_scoring = EXCLUDED.enables_driver_scoring,
  enables_anomaly_insights = EXCLUDED.enables_anomaly_insights,
  name = EXCLUDED.name;

UPDATE public.plans
SET
  enables_reports = true,
  enables_driver_scoring = true,
  enables_anomaly_insights = true
WHERE code <> 'free';

-- ---------------------------------------------------------------------------
-- Contexte facturation : champs supplémentaires
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_fleet_billing_context(p_fleet_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vehicle_count int;
  v_plan_code text;
  v_max_vehicles int;
  v_finance boolean;
  v_ai boolean;
  v_reports boolean;
  v_scoring boolean;
  v_anomaly boolean;
  v_is_paid boolean;
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

  SELECT COUNT(*)::int
  INTO v_vehicle_count
  FROM public.vehicules v
  WHERE v.fleet_id = p_fleet_id;

  SELECT
    p.code,
    p.max_vehicles,
    p.enables_finance,
    p.enables_ai,
    p.enables_reports,
    p.enables_driver_scoring,
    p.enables_anomaly_insights
  INTO
    v_plan_code,
    v_max_vehicles,
    v_finance,
    v_ai,
    v_reports,
    v_scoring,
    v_anomaly
  FROM public.abonnements a
  INNER JOIN public.plans p ON p.id = a.plan_id
  WHERE a.fleet_id = p_fleet_id
    AND a.status = 'active'
    AND a.starts_at <= now()
    AND a.ends_at >= now()
  ORDER BY a.ends_at DESC
  LIMIT 1;

  IF v_plan_code IS NULL THEN
    SELECT
      pf.max_vehicles,
      pf.enables_finance,
      pf.enables_ai,
      pf.enables_reports,
      pf.enables_driver_scoring,
      pf.enables_anomaly_insights
    INTO
      v_max_vehicles,
      v_finance,
      v_ai,
      v_reports,
      v_scoring,
      v_anomaly
    FROM public.plans pf
    WHERE pf.code = 'free'
    LIMIT 1;

    v_plan_code := 'free';
    v_is_paid := false;
  ELSE
    v_is_paid := v_plan_code <> 'free';
    IF v_plan_code = 'free' THEN
      v_max_vehicles := COALESCE(v_max_vehicles, 3);
      v_finance := false;
      v_ai := false;
      v_reports := false;
      v_scoring := false;
      v_anomaly := false;
    ELSE
      v_finance := COALESCE(v_finance, true);
      v_ai := COALESCE(v_ai, true);
      v_reports := COALESCE(v_reports, true);
      v_scoring := COALESCE(v_scoring, true);
      v_anomaly := COALESCE(v_anomaly, true);
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'plan_code', v_plan_code,
    'is_paid', v_is_paid,
    'vehicle_count', v_vehicle_count,
    'max_vehicles', COALESCE(v_max_vehicles, 999999),
    'finance_enabled', v_finance,
    'ai_enabled', v_ai,
    'reports_enabled', v_reports,
    'driver_scoring_enabled', v_scoring,
    'anomaly_insights_enabled', v_anomaly
  );
END;
$$;

COMMENT ON FUNCTION public.get_fleet_billing_context(uuid) IS
  'Hybride : abonnement actif + plan, sinon plan implicite free (3 véhicules, sans finance/IA/rapports/scoring/alertes auto).';

-- ---------------------------------------------------------------------------
-- Trigger plafond véhicules : lit max_vehicles via contexte (inchangé)
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Affectation : ignorer les garde-fous score si scoring désactivé pour la flotte
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.affecter_vehicule(
  p_fleet_id uuid,
  p_vehicle_id uuid,
  p_driver_user_id uuid,
  p_starts_at timestamptz DEFAULT now()
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vehicule public.vehicules%ROWTYPE;
  v_affectation_id uuid;
  v_score numeric;
  v_scoring boolean := true;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'non_authentifie';
  END IF;

  SELECT (public.get_fleet_billing_context(p_fleet_id)->>'driver_scoring_enabled')::boolean
  INTO v_scoring;

  SELECT * INTO v_vehicule
  FROM public.vehicules
  WHERE id = p_vehicle_id AND fleet_id = p_fleet_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'vehicule_non_trouve';
  END IF;

  IF v_vehicule.status = 'blocked' THEN
    RAISE EXCEPTION 'vehicule_bloque';
  END IF;

  IF v_scoring IS TRUE THEN
    SELECT COALESCE(sc.score_total, sc.financial_score::numeric)
    INTO v_score
    FROM public.scores_conducteurs sc
    WHERE sc.fleet_id = p_fleet_id
      AND sc.driver_user_id = p_driver_user_id
    LIMIT 1;

    IF v_score IS NOT NULL THEN
      IF v_score < 40 THEN
        RAISE EXCEPTION 'conducteur_score_suspendu_affectation';
      END IF;
      IF v_score < 60 THEN
        RAISE EXCEPTION 'conducteur_score_restreint_affectation';
      END IF;
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.affectations_vehicules a
    JOIN public.creneaux_conducteurs c ON c.assignment_id = a.id
    LEFT JOIN public.clotures_creneaux cl ON cl.shift_id = c.id
    WHERE a.vehicle_id = p_vehicle_id
      AND a.is_active = false
      AND c.status = 'closed'
      AND cl.id IS NULL
      AND c.ended_at > now() - interval '7 days'
  ) THEN
    RAISE EXCEPTION 'cloture_manquante_bloque_affectation';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.affectations_vehicules
    WHERE driver_user_id = p_driver_user_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'conducteur_deja_affecte';
  END IF;

  INSERT INTO public.affectations_vehicules(fleet_id, vehicle_id, driver_user_id, starts_at, created_by)
  VALUES (p_fleet_id, p_vehicle_id, p_driver_user_id, p_starts_at, auth.uid())
  RETURNING id INTO v_affectation_id;

  RETURN v_affectation_id;
END;
$$;

COMMENT ON FUNCTION public.affecter_vehicule(uuid, uuid, uuid, timestamptz) IS
  'Affecte un véhicule ; vérifie clôture manquante, score conducteur si scoring activé, doublons.';

-- ---------------------------------------------------------------------------
-- Alertes automatiques : no-op si analyse / alertes anomalies non incluses
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generer_alertes_automatiques(
  p_fleet_id uuid
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alert_count int := 0;
  v_shift_record record;
  v_driver_record record;
  v_vehicle_record record;
  v_anomaly boolean;
BEGIN
  SELECT (public.get_fleet_billing_context(p_fleet_id)->>'anomaly_insights_enabled')::boolean
  INTO v_anomaly;

  IF v_anomaly IS NOT TRUE THEN
    RETURN 0;
  END IF;

  FOR v_shift_record IN
    SELECT c.id as shift_id, a.driver_user_id, a.vehicle_id
    FROM creneaux_conducteurs c
    JOIN affectations_vehicules a ON a.id = c.assignment_id
    LEFT JOIN clotures_creneaux cc ON cc.shift_id = c.id
    WHERE a.fleet_id = p_fleet_id
      AND c.status = 'closed'
      AND c.ended_at < now() - interval '24 hours'
      AND cc.id IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM alertes_automatiques aa
        WHERE aa.shift_id = c.id
          AND aa.alert_type = 'missing_closure'
          AND aa.resolved = false
      )
  LOOP
    INSERT INTO alertes_automatiques (
      fleet_id, alert_type, driver_user_id, vehicle_id, shift_id,
      severity, message, resolved
    ) VALUES (
      p_fleet_id, 'missing_closure', v_shift_record.driver_user_id,
      v_shift_record.vehicle_id, v_shift_record.shift_id,
      'high', 'Clôture manquante pour un créneau fermé depuis plus de 24h', false
    );
    v_alert_count := v_alert_count + 1;
  END LOOP;

  FOR v_driver_record IN
    SELECT DISTINCT a.driver_user_id
    FROM affectations_vehicules a
    JOIN creneaux_conducteurs c ON c.assignment_id = a.id
    JOIN clotures_creneaux cc ON cc.shift_id = c.id
    WHERE a.fleet_id = p_fleet_id
      AND cc.status = 'validated'
      AND cc.revenue_gap IS NOT NULL
      AND cc.revenue_gap < 0
      AND ABS(cc.revenue_gap) > (cc.expected_revenue * 0.15)
      AND cc.created_at >= now() - interval '30 days'
    GROUP BY a.driver_user_id
    HAVING COUNT(*) >= 3
      AND NOT EXISTS (
        SELECT 1 FROM alertes_automatiques aa
        WHERE aa.driver_user_id = a.driver_user_id
          AND aa.alert_type = 'recurring_gap'
          AND aa.resolved = false
          AND aa.created_at >= now() - interval '7 days'
      )
  LOOP
    INSERT INTO alertes_automatiques (
      fleet_id, alert_type, driver_user_id,
      severity, message, resolved
    ) VALUES (
      p_fleet_id, 'recurring_gap', v_driver_record.driver_user_id,
      'medium', 'Écarts récurrents détectés sur les recettes déclarées', false
    );
    v_alert_count := v_alert_count + 1;
  END LOOP;

  FOR v_driver_record IN
    SELECT driver_user_id
    FROM scores_conducteurs
    WHERE fleet_id = p_fleet_id
      AND score_level = 'red'
      AND last_calculated_at >= now() - interval '7 days'
      AND NOT EXISTS (
        SELECT 1 FROM alertes_automatiques aa
        WHERE aa.driver_user_id = scores_conducteurs.driver_user_id
          AND aa.alert_type = 'risky_driver'
          AND aa.resolved = false
          AND aa.created_at >= now() - interval '7 days'
      )
  LOOP
    INSERT INTO alertes_automatiques (
      fleet_id, alert_type, driver_user_id,
      severity, message, resolved
    ) VALUES (
      p_fleet_id, 'risky_driver', v_driver_record.driver_user_id,
      'high', 'Chauffeur à risque détecté (score rouge)', false
    );
    v_alert_count := v_alert_count + 1;
  END LOOP;

  FOR v_vehicle_record IN
    SELECT v.id as vehicle_id
    FROM vehicules v
    WHERE v.fleet_id = p_fleet_id
      AND v.status = 'blocked'
      AND v.created_at < now() - interval '7 days'
      AND NOT EXISTS (
        SELECT 1 FROM alertes_automatiques aa
        WHERE aa.vehicle_id = v.id
          AND aa.alert_type = 'vehicle_blocked'
          AND aa.resolved = false
          AND aa.created_at >= now() - interval '7 days'
      )
  LOOP
    INSERT INTO alertes_automatiques (
      fleet_id, alert_type, vehicle_id,
      severity, message, resolved
    ) VALUES (
      p_fleet_id, 'vehicle_blocked', v_vehicle_record.vehicle_id,
      'medium', 'Véhicule bloqué depuis plus de 7 jours', false
    );
    v_alert_count := v_alert_count + 1;
  END LOOP;

  RETURN v_alert_count;
END;
$$;

-- ---------------------------------------------------------------------------
-- Scoring v2 : refus si plan sans scoring conducteur
-- ---------------------------------------------------------------------------
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
  v_scoring boolean := true;
BEGIN
  SELECT (public.get_fleet_billing_context(p_fleet_id)->>'driver_scoring_enabled')::boolean
  INTO v_scoring;

  IF v_scoring IS NOT TRUE THEN
    RAISE EXCEPTION 'scoring_non_disponible_plan' USING ERRCODE = 'P0001';
  END IF;

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

COMMIT;
