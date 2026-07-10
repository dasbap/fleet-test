-- Repair controles_journaliers so environments that already ran the first
-- DVIR migration receive the corrected runtime shape from 20260425122541.

CREATE TABLE IF NOT EXISTS public.controles_journaliers (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_id        uuid        NOT NULL REFERENCES public.flottes(id)   ON DELETE CASCADE,
  vehicle_id      uuid        NOT NULL REFERENCES public.vehicules(id) ON DELETE CASCADE,
  inspected_by    uuid        NOT NULL REFERENCES auth.users(id)       ON DELETE RESTRICT,
  inspection_type text        NOT NULL,
  items           jsonb       NOT NULL DEFAULT '{}'::jsonb,
  overall_status  text        NOT NULL DEFAULT 'ok',
  notes           text,
  odometer_km     integer,
  inspected_at    timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.controles_journaliers
  ALTER COLUMN items SET DEFAULT '{}'::jsonb,
  ALTER COLUMN overall_status SET DEFAULT 'ok',
  ALTER COLUMN inspected_at SET DEFAULT now(),
  ALTER COLUMN created_at SET DEFAULT now();

-- Old source allowed weekly/minor_issues. Convert before replacing checks.
UPDATE public.controles_journaliers
SET inspection_type = 'periodic'
WHERE inspection_type = 'weekly';

UPDATE public.controles_journaliers
SET overall_status = 'defects_noted'
WHERE overall_status = 'minor_issues';

ALTER TABLE public.controles_journaliers
  DROP CONSTRAINT IF EXISTS controles_journaliers_inspection_type_check,
  DROP CONSTRAINT IF EXISTS controles_journaliers_overall_status_check,
  ADD CONSTRAINT controles_journaliers_inspection_type_check
    CHECK (inspection_type IN ('pre_trip', 'post_trip', 'periodic')),
  ADD CONSTRAINT controles_journaliers_overall_status_check
    CHECK (overall_status IN ('ok', 'defects_noted', 'unsafe'));

-- Normalize the auth.users FK to the corrected ON DELETE RESTRICT behavior.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'controles_journaliers'
      AND constraint_name = 'controles_journaliers_inspected_by_fkey'
  ) THEN
    ALTER TABLE public.controles_journaliers
      DROP CONSTRAINT controles_journaliers_inspected_by_fkey;
  END IF;
END;
$$;

ALTER TABLE public.controles_journaliers
  ADD CONSTRAINT controles_journaliers_inspected_by_fkey
  FOREIGN KEY (inspected_by) REFERENCES auth.users(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_controles_fleet_vehicle
  ON public.controles_journaliers (fleet_id, vehicle_id, inspected_at DESC);

CREATE INDEX IF NOT EXISTS idx_controles_fleet_date
  ON public.controles_journaliers (fleet_id, inspected_at DESC);

ALTER TABLE public.controles_journaliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fleet_members_read_controles ON public.controles_journaliers;
CREATE POLICY fleet_members_read_controles
  ON public.controles_journaliers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.flotte_adhesions fa
      WHERE fa.fleet_id = controles_journaliers.fleet_id
        AND fa.user_id = auth.uid()
        AND fa.is_active = true
    )
  );

DROP POLICY IF EXISTS fleet_members_create_controles ON public.controles_journaliers;
CREATE POLICY fleet_members_create_controles
  ON public.controles_journaliers
  FOR INSERT
  WITH CHECK (
    inspected_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.flotte_adhesions fa
      WHERE fa.fleet_id = controles_journaliers.fleet_id
        AND fa.user_id = auth.uid()
        AND fa.is_active = true
        AND fa.role IN ('driver', 'mechanic', 'manager', 'organizer')
    )
  );

DROP POLICY IF EXISTS fleet_members_update_controles ON public.controles_journaliers;
CREATE POLICY fleet_members_update_controles
  ON public.controles_journaliers
  FOR UPDATE
  USING (
    inspected_by = auth.uid()
    AND inspected_at > now() - INTERVAL '24 hours'
  )
  WITH CHECK (
    inspected_by = auth.uid()
  );

DROP POLICY IF EXISTS fleet_managers_delete_controles ON public.controles_journaliers;
CREATE POLICY fleet_managers_delete_controles
  ON public.controles_journaliers
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.flotte_adhesions fa
      WHERE fa.fleet_id = controles_journaliers.fleet_id
        AND fa.user_id = auth.uid()
        AND fa.is_active = true
        AND fa.role IN ('organizer', 'manager')
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.controles_journaliers
  TO authenticated;

GRANT ALL
  ON public.controles_journaliers
  TO service_role;

COMMENT ON TABLE public.controles_journaliers IS
  'DVIR - Daily Vehicle Inspection Reports. Pre-trip, post-trip and periodic inspections.';

COMMENT ON COLUMN public.controles_journaliers.items IS
  'JSONB: [{id, label, status: ok|defect|na, note?}]';

COMMENT ON COLUMN public.controles_journaliers.overall_status IS
  'ok | defects_noted | unsafe';

COMMENT ON COLUMN public.controles_journaliers.inspection_type IS
  'pre_trip | post_trip | periodic';

NOTIFY pgrst, 'reload schema';
