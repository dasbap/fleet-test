-- MVP prédiction de pannes (SQL/RPC) : features, scoring, alertes, historique.

BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'alert_type')
     AND NOT EXISTS (
       SELECT 1
       FROM pg_enum e
       JOIN pg_type t ON t.oid = e.enumtypid
       WHERE t.typname = 'alert_type'
         AND e.enumlabel = 'failure_risk'
     ) THEN
    ALTER TYPE alert_type ADD VALUE 'failure_risk';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.failure_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_id uuid NOT NULL REFERENCES public.flottes(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES public.vehicules(id) ON DELETE CASCADE,
  risk_score int NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_level text NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  top_signals jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommended_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  model_version text NOT NULL DEFAULT 'sql-rpc-v1',
  predicted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_failure_predictions_fleet_vehicle_predicted_at
  ON public.failure_predictions(fleet_id, vehicle_id, predicted_at DESC);

ALTER TABLE public.failure_predictions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "failure_predictions_select_member" ON public.failure_predictions;
CREATE POLICY "failure_predictions_select_member"
  ON public.failure_predictions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.flotte_adhesions fa
      WHERE fa.fleet_id = failure_predictions.fleet_id
        AND fa.user_id = auth.uid()
        AND fa.is_active = true
    )
  );

CREATE OR REPLACE VIEW public.vehicle_failure_features_v1 AS
WITH incidents_30d AS (
  SELECT
    i.vehicle_id,
    COUNT(*)::int AS incident_count_30d,
    COUNT(*) FILTER (WHERE i.severity IN ('high', 'critical'))::int AS critical_incident_count_30d
  FROM public.incidents i
  WHERE i.created_at >= now() - interval '30 days'
  GROUP BY i.vehicle_id
),
maintenance_30d AS (
  SELECT
    tm.vehicle_id,
    COUNT(*)::int AS maintenance_jobs_30d
  FROM public.travaux_maintenance tm
  WHERE tm.created_at >= now() - interval '30 days'
  GROUP BY tm.vehicle_id
),
maintenance_open AS (
  SELECT
    tm.vehicle_id,
    COUNT(*) FILTER (WHERE tm.status IN ('queued', 'in_progress'))::int AS open_maintenance_jobs
  FROM public.travaux_maintenance tm
  GROUP BY tm.vehicle_id
),
fuel_base AS (
  SELECT
    jc.vehicle_id,
    jc.purchased_at,
    jc.amount_xof,
    jc.liters,
    CASE
      WHEN jc.liters > 0 THEN jc.amount_xof::numeric / jc.liters::numeric
      ELSE NULL
    END AS price_per_liter
  FROM public.journal_carburant jc
  WHERE jc.purchased_at >= now() - interval '30 days'
),
fuel_metrics AS (
  SELECT
    fb.vehicle_id,
    COUNT(*)::int AS fuel_entries_30d,
    AVG(fb.price_per_liter) AS avg_price_per_liter_30d,
    COUNT(*) FILTER (
      WHERE fb.price_per_liter > (
        SELECT AVG(fb2.price_per_liter) * 1.20
        FROM fuel_base fb2
        WHERE fb2.vehicle_id = fb.vehicle_id
      )
    )::int AS fuel_anomaly_events_30d
  FROM fuel_base fb
  GROUP BY fb.vehicle_id
)
SELECT
  v.fleet_id,
  v.id AS vehicle_id,
  v.status AS vehicle_status,
  COALESCE(i.incident_count_30d, 0) AS incident_count_30d,
  COALESCE(i.critical_incident_count_30d, 0) AS critical_incident_count_30d,
  COALESCE(m.maintenance_jobs_30d, 0) AS maintenance_jobs_30d,
  COALESCE(mo.open_maintenance_jobs, 0) AS open_maintenance_jobs,
  COALESCE(f.fuel_entries_30d, 0) AS fuel_entries_30d,
  COALESCE(f.fuel_anomaly_events_30d, 0) AS fuel_anomaly_events_30d,
  COALESCE(f.avg_price_per_liter_30d, 0)::numeric(10,2) AS avg_price_per_liter_30d
FROM public.vehicules v
LEFT JOIN incidents_30d i ON i.vehicle_id = v.id
LEFT JOIN maintenance_30d m ON m.vehicle_id = v.id
LEFT JOIN maintenance_open mo ON mo.vehicle_id = v.id
LEFT JOIN fuel_metrics f ON f.vehicle_id = v.id;

CREATE OR REPLACE FUNCTION public.predict_failure_risk(
  p_fleet_id uuid,
  p_vehicle_id uuid DEFAULT NULL
)
RETURNS TABLE (
  vehicle_id uuid,
  risk_score int,
  risk_level text,
  top_signals jsonb,
  recommended_actions jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row record;
  v_score int;
  v_level text;
  v_signals text[];
  v_actions text[];
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentification requise';
  END IF;

  IF p_fleet_id IS NULL THEN
    RAISE EXCEPTION 'fleet_id requis';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.flotte_adhesions fa
    WHERE fa.fleet_id = p_fleet_id
      AND fa.user_id = auth.uid()
      AND fa.is_active = true
  ) THEN
    RAISE EXCEPTION 'Accès refusé à cette flotte';
  END IF;

  FOR v_row IN
    SELECT *
    FROM public.vehicle_failure_features_v1 vf
    WHERE vf.fleet_id = p_fleet_id
      AND (p_vehicle_id IS NULL OR vf.vehicle_id = p_vehicle_id)
  LOOP
    v_score := LEAST(
      100,
      (v_row.critical_incident_count_30d * 20)
      + (v_row.incident_count_30d * 8)
      + (v_row.open_maintenance_jobs * 12)
      + (v_row.fuel_anomaly_events_30d * 10)
      + CASE WHEN v_row.vehicle_status = 'blocked' THEN 25 ELSE 0 END
    );

    v_signals := ARRAY[
      CASE WHEN v_row.critical_incident_count_30d > 0 THEN format('%s incident(s) critique(s) sur 30 jours', v_row.critical_incident_count_30d) END,
      CASE WHEN v_row.incident_count_30d >= 3 THEN format('%s incidents signalés sur 30 jours', v_row.incident_count_30d) END,
      CASE WHEN v_row.open_maintenance_jobs > 0 THEN format('%s entretien(s) non clôturé(s)', v_row.open_maintenance_jobs) END,
      CASE WHEN v_row.fuel_anomaly_events_30d > 0 THEN format('%s anomalie(s) carburant détectée(s)', v_row.fuel_anomaly_events_30d) END,
      CASE WHEN v_row.vehicle_status = 'blocked' THEN 'Véhicule actuellement bloqué' END
    ];

    v_actions := ARRAY[
      CASE WHEN v_row.open_maintenance_jobs > 0 THEN 'Prioriser la clôture des entretiens en cours dans les 24h.' END,
      CASE WHEN v_row.fuel_anomaly_events_30d > 0 THEN 'Contrôler le circuit carburant et vérifier les tickets de ravitaillement.' END,
      CASE WHEN v_row.critical_incident_count_30d > 0 THEN 'Planifier une inspection mécanique approfondie avant la prochaine rotation.' END,
      CASE WHEN v_row.incident_count_30d = 0 AND v_row.fuel_anomaly_events_30d = 0 THEN 'Maintenir le rythme de maintenance préventive actuel.' END
    ];

    IF v_score >= 85 THEN
      v_level := 'critical';
    ELSIF v_score >= 70 THEN
      v_level := 'high';
    ELSIF v_score >= 40 THEN
      v_level := 'medium';
    ELSE
      v_level := 'low';
    END IF;

    INSERT INTO public.failure_predictions (
      fleet_id,
      vehicle_id,
      risk_score,
      risk_level,
      top_signals,
      recommended_actions
    )
    VALUES (
      p_fleet_id,
      v_row.vehicle_id,
      v_score,
      v_level,
      to_jsonb(array_remove(v_signals, NULL)),
      to_jsonb(array_remove(v_actions, NULL))
    );

    IF v_score >= 70
      AND NOT EXISTS (
        SELECT 1
        FROM public.alertes_automatiques aa
        WHERE aa.fleet_id = p_fleet_id
          AND aa.vehicle_id = v_row.vehicle_id
          AND aa.alert_type = 'failure_risk'
          AND aa.resolved = false
          AND aa.created_at >= now() - interval '24 hours'
      ) THEN
      INSERT INTO public.alertes_automatiques (
        fleet_id,
        alert_type,
        vehicle_id,
        severity,
        message,
        resolved,
        status,
        status_updated_at
      )
      VALUES (
        p_fleet_id,
        'failure_risk',
        v_row.vehicle_id,
        CASE WHEN v_level = 'critical' THEN 'critical' ELSE 'high' END,
        format('Risque de panne %s (score %s/100). Intervention préventive recommandée.', v_level, v_score),
        false,
        'NOUVEAU',
        now()
      );
    END IF;

    vehicle_id := v_row.vehicle_id;
    risk_score := v_score;
    risk_level := v_level;
    top_signals := to_jsonb(array_remove(v_signals, NULL));
    recommended_actions := to_jsonb(array_remove(v_actions, NULL));
    RETURN NEXT;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.predict_failure_risk(uuid, uuid) TO authenticated;

COMMIT;
