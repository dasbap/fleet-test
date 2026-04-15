BEGIN;

-- Étend le type d’alerte pour couvrir les notifications WhatsApp prioritaires.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'alert_type'
  ) THEN
    ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'maintenance_due';
    ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'document_expired';
  END IF;
END $$;

-- Journal minimal des envois WhatsApp sortants.
CREATE TABLE IF NOT EXISTS public.whatsapp_outbound_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_id uuid NOT NULL REFERENCES public.flottes(id) ON DELETE CASCADE,
  alert_id uuid NULL REFERENCES public.alertes_automatiques(id) ON DELETE SET NULL,
  recipient_user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  phone_e164 text NOT NULL,
  template_name text NOT NULL,
  status text NOT NULL CHECK (status IN ('queued', 'sent', 'failed')),
  provider_message_id text NULL,
  error_code text NULL,
  error_message text NULL,
  created_by_user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_outbound_logs_fleet_id_created_at
  ON public.whatsapp_outbound_logs (fleet_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_outbound_logs_alert_id
  ON public.whatsapp_outbound_logs (alert_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_outbound_logs_recipient_user_id
  ON public.whatsapp_outbound_logs (recipient_user_id);

ALTER TABLE public.whatsapp_outbound_logs ENABLE ROW LEVEL SECURITY;

COMMIT;
