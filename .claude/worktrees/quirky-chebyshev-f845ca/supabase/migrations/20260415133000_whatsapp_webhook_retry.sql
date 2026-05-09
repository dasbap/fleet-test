BEGIN;

ALTER TABLE public.whatsapp_outbound_logs
  ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_retries integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS next_retry_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS language_code text NOT NULL DEFAULT 'fr',
  ADD COLUMN IF NOT EXISTS template_variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS provider_payload jsonb NULL;

ALTER TABLE public.whatsapp_outbound_logs
  DROP CONSTRAINT IF EXISTS whatsapp_outbound_logs_status_check;

ALTER TABLE public.whatsapp_outbound_logs
  ADD CONSTRAINT whatsapp_outbound_logs_status_check
  CHECK (status IN ('queued', 'sent', 'delivered', 'read', 'failed', 'retry_scheduled'));

CREATE INDEX IF NOT EXISTS idx_whatsapp_outbound_logs_retry
  ON public.whatsapp_outbound_logs (status, next_retry_at, retry_count);

CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_outbound_logs_provider_message_id
  ON public.whatsapp_outbound_logs (provider_message_id)
  WHERE provider_message_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.whatsapp_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_webhook_events_received_at
  ON public.whatsapp_webhook_events (received_at DESC);

ALTER TABLE public.whatsapp_webhook_events ENABLE ROW LEVEL SECURITY;

COMMIT;
