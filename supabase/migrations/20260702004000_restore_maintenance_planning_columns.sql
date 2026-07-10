-- Restore maintenance planning fields expected by dashboard, maintenance, and operations pages.
-- The historical greenfield migration added these columns, but some baseline
-- environments were created from a schema that only had the core maintenance job fields.

ALTER TABLE public.travaux_maintenance
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS planned_at timestamptz,
  ADD COLUMN IF NOT EXISTS parts jsonb DEFAULT '[]'::jsonb;

UPDATE public.travaux_maintenance
SET parts = '[]'::jsonb
WHERE parts IS NULL;

CREATE INDEX IF NOT EXISTS idx_travaux_maintenance_fleet_planned_open
  ON public.travaux_maintenance(fleet_id, planned_at)
  WHERE planned_at IS NOT NULL
    AND status IN ('queued', 'in_progress', 'blocked');

CREATE INDEX IF NOT EXISTS idx_travaux_maintenance_created_from_incident
  ON public.travaux_maintenance(created_from_incident_id)
  WHERE created_from_incident_id IS NOT NULL;

COMMENT ON COLUMN public.travaux_maintenance.notes IS
  'Free-form maintenance planning and execution notes shown in dashboard, maintenance, and operations views.';

COMMENT ON COLUMN public.travaux_maintenance.planned_at IS
  'Scheduled intervention timestamp used for overdue/upcoming dashboard windows.';

COMMENT ON COLUMN public.travaux_maintenance.parts IS
  'JSON checklist/parts payload used by the maintenance planner.';

NOTIFY pgrst, 'reload schema';
