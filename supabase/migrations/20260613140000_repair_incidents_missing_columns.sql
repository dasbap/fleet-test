-- Réparation prod : colonnes incidents absentes malgré migrations historiques enregistrées
ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open';

ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz;

ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.incidents
  DROP CONSTRAINT IF EXISTS incidents_status_check;

ALTER TABLE public.incidents
  ADD CONSTRAINT incidents_status_check
  CHECK (status IN ('open', 'investigating', 'resolved', 'closed'));

COMMENT ON COLUMN public.incidents.latitude IS 'Latitude WGS84 au signalement (terrain)';
COMMENT ON COLUMN public.incidents.longitude IS 'Longitude WGS84 au signalement (terrain)';

CREATE INDEX IF NOT EXISTS idx_incidents_status_resolved_at
  ON public.incidents(status, resolved_at);

NOTIFY pgrst, 'reload schema';
