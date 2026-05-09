-- Catégorie métier pour les signalements (UI + rapports)
ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS incident_category text;

COMMENT ON COLUMN public.incidents.incident_category IS
  'Type d''incident : breakdown, accident, theft, damage, fire, other (validé côté application)';
