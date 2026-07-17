-- Restore driver scoring runtime objects expected by the dashboard widget.
-- Baseline environments can have scores_conducteurs without the v2 score
-- columns and without the get_top_driver_scores RPC.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'driver_score_level'
  ) THEN
    CREATE TYPE public.driver_score_level AS ENUM ('green', 'orange', 'red');
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.scores_conducteurs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_user_id uuid NOT NULL,
  fleet_id uuid NOT NULL REFERENCES public.flottes(id) ON DELETE CASCADE,
  score_level public.driver_score_level NOT NULL DEFAULT 'green',
  financial_score numeric(5,2) NOT NULL DEFAULT 100.00 CHECK (financial_score >= 0 AND financial_score <= 100),
  score_total numeric(5,2),
  incidents_score numeric(5,2),
  closure_delay_score numeric(5,2),
  shift_discipline_score numeric(5,2),
  operational_stability_score numeric(5,2),
  model_version text NOT NULL DEFAULT 'v1-hybrid',
  model_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_calculated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(driver_user_id, fleet_id)
);

ALTER TABLE public.scores_conducteurs
  ADD COLUMN IF NOT EXISTS score_total numeric(5,2),
  ADD COLUMN IF NOT EXISTS incidents_score numeric(5,2),
  ADD COLUMN IF NOT EXISTS closure_delay_score numeric(5,2),
  ADD COLUMN IF NOT EXISTS shift_discipline_score numeric(5,2),
  ADD COLUMN IF NOT EXISTS operational_stability_score numeric(5,2),
  ADD COLUMN IF NOT EXISTS model_version text NOT NULL DEFAULT 'v1-hybrid',
  ADD COLUMN IF NOT EXISTS model_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.scores_conducteurs
SET
  score_total = COALESCE(score_total, financial_score),
  incidents_score = COALESCE(incidents_score, financial_score),
  closure_delay_score = COALESCE(closure_delay_score, financial_score),
  shift_discipline_score = COALESCE(shift_discipline_score, financial_score),
  operational_stability_score = COALESCE(operational_stability_score, financial_score),
  model_version = COALESCE(model_version, 'v1-hybrid'),
  model_metadata = COALESCE(model_metadata, '{}'::jsonb);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'scores_conducteurs'
      AND c.conname = 'scores_conducteurs_driver_user_id_fkey'
  ) THEN
    ALTER TABLE public.scores_conducteurs
      DROP CONSTRAINT scores_conducteurs_driver_user_id_fkey;
  END IF;

  ALTER TABLE public.scores_conducteurs
    ADD CONSTRAINT scores_conducteurs_driver_user_id_fkey
    FOREIGN KEY (driver_user_id) REFERENCES public.profils(user_id) ON DELETE CASCADE;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_scores_conducteurs_fleet_score_total
  ON public.scores_conducteurs(fleet_id, score_total DESC NULLS LAST, last_calculated_at DESC);

DROP FUNCTION IF EXISTS public.get_top_driver_scores(uuid, int);

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
STABLE
SET search_path = public
AS $$
DECLARE
  v_limit int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifie';
  END IF;

  IF NOT (
    public.has_role(p_fleet_id, 'organizer'::public.role_type)
    OR public.has_role(p_fleet_id, 'manager'::public.role_type)
    OR public.has_role(p_fleet_id, 'mechanic'::public.role_type)
    OR public.has_role(p_fleet_id, 'driver'::public.role_type)
  ) THEN
    RAISE EXCEPTION 'Acces refuse pour cette flotte';
  END IF;

  v_limit := LEAST(GREATEST(COALESCE(p_limit, 5), 1), 100);

  RETURN QUERY
  SELECT
    sc.id,
    sc.driver_user_id,
    sc.fleet_id,
    sc.score_level,
    sc.financial_score,
    COALESCE(sc.score_total, sc.financial_score)::numeric AS score_total,
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
    COALESCE(sc.score_total, sc.financial_score) DESC NULLS LAST,
    sc.last_calculated_at DESC,
    sc.created_at DESC
  LIMIT v_limit;
END;
$$;

COMMENT ON FUNCTION public.get_top_driver_scores(uuid, int) IS
  'Returns top driver scores for one fleet with bounded limit and RBAC access check.';

GRANT EXECUTE ON FUNCTION public.get_top_driver_scores(uuid, int) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_top_driver_scores(uuid, int) FROM anon;

NOTIFY pgrst, 'reload schema';
