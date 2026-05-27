-- Table whatsapp_retry_queue
-- Consommée par le worker de relance WhatsApp (future Edge Function ou pg_cron).
-- billing-lifecycle-cron insère ici les relances pour flottes en grace_period/suspended.

CREATE TABLE IF NOT EXISTS public.whatsapp_retry_queue (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_id     uuid        NOT NULL REFERENCES public.flottes(id) ON DELETE CASCADE,
  phone        text        NOT NULL,
  template     text        NOT NULL,
  payload      jsonb       NOT NULL DEFAULT '{}',
  status       text        NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  retry_count  int         NOT NULL DEFAULT 0,
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  sent_at      timestamptz,
  error_msg    text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.whatsapp_retry_queue IS
  'File d''attente relances WhatsApp billing (grace_period, suspended). Consumer : future worker billing.';

CREATE INDEX IF NOT EXISTS wrq_status_scheduled_idx
  ON public.whatsapp_retry_queue (status, scheduled_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS wrq_fleet_idx
  ON public.whatsapp_retry_queue (fleet_id, created_at DESC);

-- RLS : service_role uniquement (Edge Function billing)
ALTER TABLE public.whatsapp_retry_queue ENABLE ROW LEVEL SECURITY;
-- Pas de policy user — accès exclusif via service_role
