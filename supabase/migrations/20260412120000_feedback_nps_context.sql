-- Contexte NPS optionnel : déclencheur, entité liée (évite "trigger" mot réservé SQL).
ALTER TABLE public.feedback
  ADD COLUMN IF NOT EXISTS nps_trigger text NULL,
  ADD COLUMN IF NOT EXISTS entity_id uuid NULL,
  ADD COLUMN IF NOT EXISTS entity_type text NULL;

COMMENT ON COLUMN public.feedback.nps_trigger IS
  'Origine du sondage : alert_resolved, maintenance_closed, first_month, manual.';
