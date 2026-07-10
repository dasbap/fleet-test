-- Bootstrap idempotent pour les bases creees via baseline squash.
-- Couvre les objets utilises par /onboarding sans rejouer tout l'historique legacy.

BEGIN;

CREATE TABLE IF NOT EXISTS public.onboarding_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  step integer NOT NULL DEFAULT 1,
  completed boolean NOT NULL DEFAULT false,
  steps_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'onboarding_progress'
      AND column_name = 'data'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'onboarding_progress'
      AND column_name = 'steps_data'
  ) THEN
    ALTER TABLE public.onboarding_progress RENAME COLUMN data TO steps_data;
  END IF;
END
$$;

ALTER TABLE public.onboarding_progress
  ADD COLUMN IF NOT EXISTS steps_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY org_id
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
    ) AS rn
  FROM public.onboarding_progress
)
DELETE FROM public.onboarding_progress op
USING ranked r
WHERE op.id = r.id
  AND r.rn > 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'onboarding_progress_org_id_key'
  ) THEN
    ALTER TABLE public.onboarding_progress
      ADD CONSTRAINT onboarding_progress_org_id_key UNIQUE (org_id);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_onboarding_progress_org_id
  ON public.onboarding_progress(org_id);

ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.user_can_manage_org_onboarding(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.flotte_adhesions fa
    INNER JOIN public.flottes f ON f.id = fa.fleet_id
    WHERE f.org_id = p_org_id
      AND fa.user_id = auth.uid()
      AND fa.is_active = true
      AND fa.role::text IN ('organizer', 'manager')
  );
$$;

GRANT EXECUTE ON FUNCTION public.user_can_manage_org_onboarding(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.user_can_manage_org_onboarding(uuid) FROM anon;

DROP POLICY IF EXISTS "org members only" ON public.onboarding_progress;

DROP POLICY IF EXISTS onboarding_progress_select ON public.onboarding_progress;
CREATE POLICY onboarding_progress_select ON public.onboarding_progress
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.user_can_manage_org_onboarding(org_id)
  );

DROP POLICY IF EXISTS onboarding_progress_insert ON public.onboarding_progress;
CREATE POLICY onboarding_progress_insert ON public.onboarding_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND public.user_can_manage_org_onboarding(org_id)
  );

DROP POLICY IF EXISTS onboarding_progress_update ON public.onboarding_progress;
CREATE POLICY onboarding_progress_update ON public.onboarding_progress
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.user_can_manage_org_onboarding(org_id)
  )
  WITH CHECK (
    public.user_can_manage_org_onboarding(org_id)
  );

CREATE OR REPLACE FUNCTION public.sauvegarder_progression_onboarding(
  p_org_id uuid,
  p_step integer,
  p_completed boolean,
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
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'non_authentifie';
  END IF;

  IF p_org_id IS NULL THEN
    RAISE EXCEPTION 'org_id_requis';
  END IF;

  IF p_step IS NULL OR p_step < 1 OR p_step > 4 THEN
    RAISE EXCEPTION 'etape_invalide';
  END IF;

  IF NOT public.user_can_manage_org_onboarding(p_org_id) THEN
    RAISE EXCEPTION 'permission_refusee_onboarding';
  END IF;

  INSERT INTO public.onboarding_progress (
    org_id,
    user_id,
    step,
    completed,
    steps_data,
    updated_at
  )
  VALUES (
    p_org_id,
    v_uid,
    p_step,
    COALESCE(p_completed, false),
    COALESCE(p_steps_data, '{}'::jsonb),
    now()
  )
  ON CONFLICT (org_id) DO UPDATE SET
    step = EXCLUDED.step,
    completed = EXCLUDED.completed,
    steps_data = EXCLUDED.steps_data,
    updated_at = now(),
    user_id = CASE
      WHEN onboarding_progress.user_id = v_uid THEN onboarding_progress.user_id
      ELSE v_uid
    END
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row);
END;
$$;

GRANT EXECUTE ON FUNCTION public.sauvegarder_progression_onboarding(uuid, integer, boolean, jsonb) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.sauvegarder_progression_onboarding(uuid, integer, boolean, jsonb) FROM anon;

CREATE OR REPLACE FUNCTION public.finaliser_onboarding(p_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'non_authentifie';
  END IF;

  IF NOT public.user_can_manage_org_onboarding(p_org_id) THEN
    RAISE EXCEPTION 'permission_refusee_onboarding';
  END IF;

  UPDATE public.onboarding_progress
  SET completed = true, step = GREATEST(step, 4), updated_at = now()
  WHERE org_id = p_org_id;

  IF NOT FOUND THEN
    INSERT INTO public.onboarding_progress (org_id, user_id, step, completed, steps_data)
    VALUES (p_org_id, auth.uid(), 4, true, '{}'::jsonb);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.finaliser_onboarding(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.finaliser_onboarding(uuid) FROM anon;

CREATE TABLE IF NOT EXISTS public.funnel_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  step smallint NULL CHECK (step BETWEEN 1 AND 4),
  status text NULL,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.funnel_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "funnel events owner read" ON public.funnel_events;
CREATE POLICY "funnel events owner read"
  ON public.funnel_events
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.user_can_manage_org_onboarding(org_id)
  );

DROP POLICY IF EXISTS "funnel events owner insert" ON public.funnel_events;
CREATE POLICY "funnel events owner insert"
  ON public.funnel_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND public.user_can_manage_org_onboarding(org_id)
  );

CREATE INDEX IF NOT EXISTS idx_funnel_events_org_time
  ON public.funnel_events(org_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_funnel_events_org_type
  ON public.funnel_events(org_id, event_type, step);

CREATE OR REPLACE FUNCTION public.track_funnel_event(
  p_org_id uuid,
  p_event_type text,
  p_step smallint DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_context jsonb DEFAULT '{}'::jsonb,
  p_occurred_at timestamptz DEFAULT now()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'non_authentifie';
  END IF;

  IF NOT public.user_can_manage_org_onboarding(p_org_id) THEN
    RAISE EXCEPTION 'permission_refusee_funnel';
  END IF;

  INSERT INTO public.funnel_events (
    org_id,
    user_id,
    event_type,
    step,
    status,
    context,
    occurred_at
  )
  VALUES (
    p_org_id,
    v_user_id,
    p_event_type,
    p_step,
    p_status,
    COALESCE(p_context, '{}'::jsonb),
    COALESCE(p_occurred_at, now())
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.track_funnel_event(uuid, text, smallint, text, jsonb, timestamptz) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.track_funnel_event(uuid, text, smallint, text, jsonb, timestamptz) FROM anon;

CREATE OR REPLACE FUNCTION public.get_funnel_metrics(
  p_org_id uuid,
  p_days integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'non_authentifie';
  END IF;

  IF NOT public.user_can_manage_org_onboarding(p_org_id) THEN
    RAISE EXCEPTION 'permission_refusee_funnel';
  END IF;

  WITH scoped AS (
    SELECT *
    FROM public.funnel_events
    WHERE org_id = p_org_id
      AND occurred_at >= now() - make_interval(days => greatest(1, p_days))
  ),
  step_stats AS (
    SELECT
      step,
      count(DISTINCT user_id) FILTER (WHERE event_type = 'onboarding_step_view') AS views,
      count(DISTINCT user_id) FILTER (
        WHERE event_type IN ('onboarding_step_completed', 'onboarding_completed')
      ) AS completions
    FROM scoped
    WHERE step BETWEEN 1 AND 4
    GROUP BY step
  ),
  attempt_stats AS (
    SELECT
      count(*) FILTER (WHERE event_type = 'one_click_attempt') AS attempts,
      count(*) FILTER (WHERE event_type = 'one_click_success') AS successes
    FROM scoped
  ),
  first_step_view AS (
    SELECT user_id, min(occurred_at) AS first_view_at
    FROM scoped
    WHERE event_type = 'onboarding_step_view' AND step = 1
    GROUP BY user_id
  ),
  first_success AS (
    SELECT user_id, min(occurred_at) AS first_success_at
    FROM scoped
    WHERE event_type = 'one_click_success'
    GROUP BY user_id
  ),
  ttv AS (
    SELECT avg(extract(epoch FROM (s.first_success_at - v.first_view_at))) AS avg_seconds
    FROM first_step_view v
    JOIN first_success s USING (user_id)
    WHERE s.first_success_at >= v.first_view_at
  )
  SELECT jsonb_build_object(
    'windowDays', greatest(1, p_days),
    'onboardingStep1DropRate', coalesce(round((((SELECT views FROM step_stats WHERE step = 1) - (SELECT completions FROM step_stats WHERE step = 1)) * 100.0) / nullif((SELECT views FROM step_stats WHERE step = 1), 0), 1), 0),
    'onboardingStep2DropRate', coalesce(round((((SELECT views FROM step_stats WHERE step = 2) - (SELECT completions FROM step_stats WHERE step = 2)) * 100.0) / nullif((SELECT views FROM step_stats WHERE step = 2), 0), 1), 0),
    'onboardingStep3DropRate', coalesce(round((((SELECT views FROM step_stats WHERE step = 3) - (SELECT completions FROM step_stats WHERE step = 3)) * 100.0) / nullif((SELECT views FROM step_stats WHERE step = 3), 0), 1), 0),
    'onboardingStep4DropRate', coalesce(round((((SELECT views FROM step_stats WHERE step = 4) - (SELECT completions FROM step_stats WHERE step = 4)) * 100.0) / nullif((SELECT views FROM step_stats WHERE step = 4), 0), 1), 0),
    'oneClickAttemptCount', coalesce((SELECT attempts FROM attempt_stats), 0),
    'oneClickSuccessCount', coalesce((SELECT successes FROM attempt_stats), 0),
    'oneClickSuccessRate', coalesce(round(((SELECT successes FROM attempt_stats) * 100.0) / nullif((SELECT attempts FROM attempt_stats), 0), 1), 0),
    'avgTimeToValueSeconds', coalesce(round((SELECT avg_seconds FROM ttv), 0), 0)
  )
  INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_funnel_metrics(uuid, integer) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_funnel_metrics(uuid, integer) FROM anon;

NOTIFY pgrst, 'reload schema';

COMMIT;
