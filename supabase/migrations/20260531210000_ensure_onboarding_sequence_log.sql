-- Filet de sécurité : tables onboarding / system_events si migration 20260413100000 absente ou incomplète.

BEGIN;

CREATE TABLE IF NOT EXISTS public.system_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  fleet_id uuid REFERENCES public.flottes (id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_events_fleet_created
  ON public.system_events (fleet_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_events_type_created
  ON public.system_events (event_type, created_at DESC);

ALTER TABLE public.system_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.onboarding_sequence_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  fleet_id uuid NOT NULL REFERENCES public.flottes (id) ON DELETE CASCADE,
  step_day smallint NOT NULL,
  channel text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}',
  CONSTRAINT onboarding_sequence_log_step_day_check CHECK (step_day >= 1 AND step_day <= 366),
  CONSTRAINT onboarding_sequence_log_user_fleet_step_unique UNIQUE (user_id, fleet_id, step_day)
);

CREATE INDEX IF NOT EXISTS idx_onboarding_sequence_log_sent
  ON public.onboarding_sequence_log (sent_at DESC);

ALTER TABLE public.onboarding_sequence_log ENABLE ROW LEVEL SECURITY;

COMMIT;
