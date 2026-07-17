-- Restore scheduled reports runtime objects expected by /dashboard/reports/scheduled.
-- Some baseline environments were created without the historical scheduled
-- reports migration, which makes PostgREST return PGRST205 for scheduled_reports.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'report_format'
  ) THEN
    CREATE TYPE public.report_format AS ENUM ('pdf', 'excel');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'report_frequency'
  ) THEN
    CREATE TYPE public.report_frequency AS ENUM ('daily', 'weekly', 'monthly');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'report_type'
  ) THEN
    CREATE TYPE public.report_type AS ENUM (
      'fleet_summary',
      'fuel_history',
      'maintenance_due',
      'driver_scores',
      'incidents'
    );
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.scheduled_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_id uuid NOT NULL REFERENCES public.flottes(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  report_type public.report_type NOT NULL,
  format public.report_format NOT NULL DEFAULT 'pdf',
  frequency public.report_frequency NOT NULL,
  day_of_week smallint CHECK (day_of_week BETWEEN 0 AND 6),
  day_of_month smallint CHECK (day_of_month BETWEEN 1 AND 28),
  send_hour_utc smallint NOT NULL DEFAULT 6 CHECK (send_hour_utc BETWEEN 0 AND 23),
  recipient_emails text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  next_run_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.scheduled_report_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_report_id uuid NOT NULL REFERENCES public.scheduled_reports(id) ON DELETE CASCADE,
  fleet_id uuid NOT NULL REFERENCES public.flottes(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'succeeded', 'failed')),
  storage_path text,
  error_message text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_scheduled_reports_fleet
  ON public.scheduled_reports(fleet_id, is_active);

CREATE INDEX IF NOT EXISTS idx_scheduled_reports_next_run
  ON public.scheduled_reports(next_run_at)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_scheduled_report_runs_report
  ON public.scheduled_report_runs(scheduled_report_id, started_at DESC);

ALTER TABLE public.scheduled_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_report_runs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_scheduled_reports_updated_at ON public.scheduled_reports;
CREATE TRIGGER trg_scheduled_reports_updated_at
  BEFORE UPDATE ON public.scheduled_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

DROP POLICY IF EXISTS scheduled_reports_select_policy ON public.scheduled_reports;
CREATE POLICY scheduled_reports_select_policy
  ON public.scheduled_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.flotte_adhesions fa
      WHERE fa.fleet_id = scheduled_reports.fleet_id
        AND fa.user_id = auth.uid()
        AND fa.is_active = true
    )
  );

DROP POLICY IF EXISTS scheduled_reports_write_policy ON public.scheduled_reports;
CREATE POLICY scheduled_reports_write_policy
  ON public.scheduled_reports FOR ALL
  USING (
    public.has_role(fleet_id, 'organizer'::public.role_type)
    OR public.has_role(fleet_id, 'manager'::public.role_type)
  )
  WITH CHECK (
    public.has_role(fleet_id, 'organizer'::public.role_type)
    OR public.has_role(fleet_id, 'manager'::public.role_type)
  );

DROP POLICY IF EXISTS scheduled_report_runs_select_policy ON public.scheduled_report_runs;
CREATE POLICY scheduled_report_runs_select_policy
  ON public.scheduled_report_runs FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.flotte_adhesions fa
      WHERE fa.fleet_id = scheduled_report_runs.fleet_id
        AND fa.user_id = auth.uid()
        AND fa.is_active = true
    )
  );

CREATE OR REPLACE FUNCTION public.get_due_scheduled_reports(p_now timestamptz DEFAULT now())
RETURNS SETOF public.scheduled_reports
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.scheduled_reports
  WHERE is_active = true
    AND next_run_at <= p_now
  ORDER BY next_run_at;
$$;

COMMENT ON TABLE public.scheduled_reports IS
  'Scheduled report definitions shown and managed from the reports scheduled page.';

COMMENT ON TABLE public.scheduled_report_runs IS
  'Execution history for scheduled reports generated by the scheduled report job.';

COMMENT ON FUNCTION public.get_due_scheduled_reports(timestamptz) IS
  'Returns active scheduled reports due at or before the provided timestamp.';

REVOKE EXECUTE ON FUNCTION public.get_due_scheduled_reports(timestamptz) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_due_scheduled_reports(timestamptz) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_due_scheduled_reports(timestamptz) TO service_role;

NOTIFY pgrst, 'reload schema';
