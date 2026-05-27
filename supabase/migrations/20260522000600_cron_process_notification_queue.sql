-- Migration : cron pg_cron pour process-notification-queue
-- Planifie l'envoi des emails de relance billing toutes les 15 minutes.
-- Provider email : Resend (RESEND_API_KEY secret requis côté Edge Function).

SELECT cron.unschedule('process-notification-queue')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'process-notification-queue'
);

SELECT cron.schedule(
  'process-notification-queue',
  '*/15 * * * *',
  $$
  SELECT extensions.http_post(
    url     := 'https://zqxjvmejoktwlcqshnwi.supabase.co/functions/v1/process-notification-queue',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body    := '{"secret": "0bab199e48c45107c88f3c09cb4b369dfdf183b1613d0f5e32c024265d9401a1"}'::jsonb
  );
  $$
);

COMMENT ON SCHEMA cron IS
  'process-notification-queue : consomme notification_queue (emails billing relances grace/suspended) — Resend — toutes les 15 min.';
