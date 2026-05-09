-- Position au moment du signalement (WGS84), optionnelle
ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

COMMENT ON COLUMN public.incidents.latitude IS 'Latitude WGS84 au signalement (terrain)';
COMMENT ON COLUMN public.incidents.longitude IS 'Longitude WGS84 au signalement (terrain)';
