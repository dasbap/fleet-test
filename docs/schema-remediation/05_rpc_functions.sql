-- ============================================================
-- 05_rpc_functions.sql — E-Samba
-- Fonctions RPC canoniques. CREATE OR REPLACE idempotent.
-- ============================================================

-- ════════════════════════════════════════════════════════════
-- HELPERS SÉCURITÉ
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profils
    WHERE user_id = auth.uid()
      AND universe::text = 'internal'
      AND status::text IN ('active')
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.user_can_manage_org_onboarding(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_platform_admin()
    OR EXISTS (
      SELECT 1
      FROM public.flotte_adhesions fa
      JOIN public.flottes f ON f.id = fa.fleet_id
      WHERE f.org_id = p_org_id
        AND fa.user_id = auth.uid()
        AND fa.is_active = true
        AND fa.role::text IN ('organizer', 'manager')
    );
$$;
GRANT EXECUTE ON FUNCTION public.user_can_manage_org_onboarding(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.has_role(p_fleet_id uuid, p_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.flotte_adhesions fa
    WHERE fa.fleet_id = p_fleet_id
      AND fa.user_id = auth.uid()
      AND fa.is_active = true
      AND fa.role::text = ANY(p_roles)
  )
  OR public.is_platform_admin();
$$;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, text[]) TO authenticated;

-- ════════════════════════════════════════════════════════════
-- ONBOARDING
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.sauvegarder_progression_onboarding(
  p_org_id     uuid,
  p_step       integer,
  p_completed  boolean,
  p_steps_data jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.onboarding_progress;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'non_authentifie'; END IF;
  IF p_org_id IS NULL THEN RAISE EXCEPTION 'org_id_requis'; END IF;
  IF p_step IS NULL OR p_step < 1 OR p_step > 4 THEN RAISE EXCEPTION 'etape_invalide : %', p_step; END IF;
  IF NOT public.user_can_manage_org_onboarding(p_org_id) THEN
    RAISE EXCEPTION 'permission_refusee : organisation %', p_org_id;
  END IF;

  INSERT INTO public.onboarding_progress (org_id, user_id, step, completed, steps_data, updated_at)
  VALUES (p_org_id, v_uid, p_step, COALESCE(p_completed, false), COALESCE(p_steps_data, '{}'), now())
  ON CONFLICT (org_id) DO UPDATE SET
    step       = EXCLUDED.step,
    completed  = EXCLUDED.completed,
    steps_data = EXCLUDED.steps_data,
    updated_at = now(),
    -- Ne pas changer user_id si c'est un autre manager qui reprend
    user_id    = CASE WHEN onboarding_progress.user_id = v_uid
                   THEN onboarding_progress.user_id ELSE v_uid END
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row);
END;
$$;
GRANT EXECUTE ON FUNCTION public.sauvegarder_progression_onboarding(uuid, integer, boolean, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.finaliser_onboarding(p_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'non_authentifie'; END IF;
  IF NOT public.user_can_manage_org_onboarding(p_org_id) THEN
    RAISE EXCEPTION 'permission_refusee';
  END IF;

  UPDATE public.onboarding_progress
  SET completed = true, updated_at = now()
  WHERE org_id = p_org_id;

  IF NOT FOUND THEN
    INSERT INTO public.onboarding_progress (org_id, user_id, step, completed, steps_data)
    VALUES (p_org_id, auth.uid(), 4, true, '{}');
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.finaliser_onboarding(uuid) TO authenticated;

-- ════════════════════════════════════════════════════════════
-- SCORES CONDUCTEURS
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.calculer_score_conducteur_v2(
  p_driver_user_id uuid,
  p_fleet_id       uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_creneaux       integer := 0;
  v_creneaux_clos        integer := 0;
  v_retard_moyen_minutes numeric := 0;
  v_incidents_30j        integer := 0;
  v_revenue_gap_total    bigint  := 0;
  v_financial_score      numeric := 100;
  v_incidents_score      numeric := 100;
  v_closure_delay_score  numeric := 100;
  v_shift_discipline     numeric := 100;
  v_score_total          numeric;
  v_level                text    := 'green';
BEGIN
  -- 1. Creneaux des 30 derniers jours
  SELECT
    COUNT(*)                                                    INTO v_total_creneaux
  FROM public.creneaux_conducteurs cc
  JOIN public.affectations_vehicules av ON av.id = cc.assignment_id
  WHERE av.driver_user_id = p_driver_user_id
    AND av.fleet_id = p_fleet_id
    AND cc.started_at >= now() - interval '30 days';

  -- 2. Clôtures (30j)
  SELECT
    COUNT(*),
    COALESCE(AVG(
      EXTRACT(EPOCH FROM (cl.created_at - cc.ended_at)) / 60
    ), 0),
    COALESCE(SUM(ABS(COALESCE(cl.revenue_gap, 0))), 0)
  INTO v_creneaux_clos, v_retard_moyen_minutes, v_revenue_gap_total
  FROM public.clotures_creneaux cl
  JOIN public.creneaux_conducteurs cc ON cc.id = cl.shift_id
  JOIN public.affectations_vehicules av ON av.id = cc.assignment_id
  WHERE av.driver_user_id = p_driver_user_id
    AND av.fleet_id = p_fleet_id
    AND cl.created_at >= now() - interval '30 days';

  -- 3. Incidents (30j)
  SELECT COUNT(*) INTO v_incidents_30j
  FROM public.incidents i
  JOIN public.vehicules v ON v.id = i.vehicle_id
  WHERE i.driver_user_id = p_driver_user_id
    AND v.fleet_id = p_fleet_id
    AND i.created_at >= now() - interval '30 days';

  -- 4. Calcul scores (0-100)
  -- Discipline clôture : ratio creneaux clos / total
  IF v_total_creneaux > 0 THEN
    v_shift_discipline := LEAST(100, ROUND((v_creneaux_clos::numeric / v_total_creneaux) * 100, 2));
  END IF;

  -- Retard moyen clôture (>60 min = pénalité)
  v_closure_delay_score := GREATEST(0, LEAST(100, 100 - (v_retard_moyen_minutes / 60 * 10)));

  -- Incidents (chaque incident = -15 pts)
  v_incidents_score := GREATEST(0, 100 - (v_incidents_30j * 15));

  -- Financial (gap > 5000 XAF = pénalité)
  v_financial_score := GREATEST(0, LEAST(100, 100 - (v_revenue_gap_total / 5000.0)));

  -- Score global pondéré
  v_score_total := ROUND(
    (v_financial_score * 0.35)
    + (v_incidents_score * 0.25)
    + (v_closure_delay_score * 0.25)
    + (v_shift_discipline * 0.15),
    2
  );

  -- Niveau
  v_level := CASE
    WHEN v_score_total >= 85 THEN 'green'
    WHEN v_score_total >= 65 THEN 'yellow'
    WHEN v_score_total >= 45 THEN 'orange'
    ELSE 'red'
  END;

  -- Upsert score
  INSERT INTO public.scores_conducteurs (
    driver_user_id, fleet_id, score_total, financial_score,
    incidents_score, closure_delay_score, shift_discipline_score,
    score_level, last_calculated_at
  )
  VALUES (
    p_driver_user_id, p_fleet_id, v_score_total, v_financial_score,
    v_incidents_score, v_closure_delay_score, v_shift_discipline,
    v_level::public.driver_score_level, now()
  )
  ON CONFLICT (driver_user_id, fleet_id) DO UPDATE SET
    score_total             = EXCLUDED.score_total,
    financial_score         = EXCLUDED.financial_score,
    incidents_score         = EXCLUDED.incidents_score,
    closure_delay_score     = EXCLUDED.closure_delay_score,
    shift_discipline_score  = EXCLUDED.shift_discipline_score,
    score_level             = EXCLUDED.score_level,
    last_calculated_at      = now();

  RETURN jsonb_build_object(
    'driver_user_id',        p_driver_user_id,
    'fleet_id',              p_fleet_id,
    'score_total',           v_score_total,
    'financial_score',       v_financial_score,
    'incidents_score',       v_incidents_score,
    'closure_delay_score',   v_closure_delay_score,
    'shift_discipline_score',v_shift_discipline,
    'score_level',           v_level,
    'creneaux_30j',          v_total_creneaux,
    'incidents_30j',         v_incidents_30j
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.calculer_score_conducteur_v2(uuid, uuid) TO authenticated;

-- ── Contrainte UNIQUE requise par l'upsert ────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public' AND t.relname = 'scores_conducteurs'
      AND c.contype = 'u'
  ) THEN
    ALTER TABLE public.scores_conducteurs
      ADD CONSTRAINT scores_conducteurs_driver_fleet_unique UNIQUE (driver_user_id, fleet_id);
  END IF;
END $$;

-- ════════════════════════════════════════════════════════════
-- TOP DRIVERS
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_top_driver_scores(
  p_fleet_id uuid,
  p_limit    integer DEFAULT 10
)
RETURNS TABLE (
  driver_user_id  uuid,
  full_name       text,
  phone           text,
  score_total     numeric,
  score_level     text,
  financial_score numeric,
  incidents_score numeric,
  last_calculated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    sc.driver_user_id,
    p.full_name,
    p.phone,
    sc.score_total,
    sc.score_level::text,
    sc.financial_score,
    sc.incidents_score,
    sc.last_calculated_at
  FROM public.scores_conducteurs sc
  LEFT JOIN public.profils p ON p.user_id = sc.driver_user_id
  WHERE sc.fleet_id = p_fleet_id
  ORDER BY sc.score_total DESC NULLS LAST
  LIMIT p_limit;
$$;
GRANT EXECUTE ON FUNCTION public.get_top_driver_scores(uuid, integer) TO authenticated;

-- ════════════════════════════════════════════════════════════
-- FLEET BILLING CONTEXT
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_fleet_billing_context(p_fleet_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'fleet_id',       f.id,
    'billing_status', f.billing_status,
    'plan_cache',     f.plan_cache,
    'trial_ends_at',  f.trial_ends_at,
    'vehicle_count',  (SELECT COUNT(*) FROM public.vehicules v
                       WHERE v.fleet_id = f.id AND v.status != 'archived'),
    'member_count',   (SELECT COUNT(*) FROM public.flotte_adhesions fa
                       WHERE fa.fleet_id = f.id AND fa.is_active = true),
    'org_id',         f.org_id,
    'org_name',       o.name
  )
  FROM public.flottes f
  LEFT JOIN public.organisations o ON o.id = f.org_id
  WHERE f.id = p_fleet_id
    AND public.has_role(p_fleet_id, ARRAY['organizer','manager'])
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_fleet_billing_context(uuid) TO authenticated;

-- ════════════════════════════════════════════════════════════
-- FLEET ACTIVATION METRICS
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.fleet_activation_metrics(p_fleet_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'fleet_id',              p_fleet_id,
    'total_drivers',         COUNT(*) FILTER (WHERE fa.role::text = 'driver'),
    'active_drivers',        COUNT(*) FILTER (
                               WHERE fa.role::text = 'driver'
                               AND EXISTS (
                                 SELECT 1 FROM public.affectations_vehicules av
                                 WHERE av.driver_user_id = fa.user_id AND av.fleet_id = p_fleet_id
                                   AND av.is_active = true
                               )
                             ),
    'total_vehicles',        (SELECT COUNT(*) FROM public.vehicules v
                              WHERE v.fleet_id = p_fleet_id),
    'active_vehicles',       (SELECT COUNT(*) FROM public.vehicules v
                              WHERE v.fleet_id = p_fleet_id AND v.status = 'active'),
    'open_shifts',           (SELECT COUNT(*) FROM public.creneaux_conducteurs cc
                              JOIN public.affectations_vehicules av ON av.id = cc.assignment_id
                              WHERE av.fleet_id = p_fleet_id AND cc.status = 'open'),
    'pending_closures',      (SELECT COUNT(*) FROM public.clotures_creneaux cl
                              JOIN public.creneaux_conducteurs cc ON cc.id = cl.shift_id
                              JOIN public.affectations_vehicules av ON av.id = cc.assignment_id
                              WHERE av.fleet_id = p_fleet_id AND cl.status = 'pending')
  )
  FROM public.flotte_adhesions fa
  WHERE fa.fleet_id = p_fleet_id AND fa.is_active = true;
$$;
GRANT EXECUTE ON FUNCTION public.fleet_activation_metrics(uuid) TO authenticated;
