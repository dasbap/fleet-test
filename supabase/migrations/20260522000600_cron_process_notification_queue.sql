-- Migration : cron pg_cron pour process-notification-queue
-- Planifie l'envoi des emails de relance billing toutes les 15 minutes.
-- Provider email : Resend (RESEND_API_KEY secret requis cote Edge Function).

DO $$
DECLARE
  job_exists boolean;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
    AND to_regnamespace('cron') IS NOT NULL
    AND to_regclass('cron.job') IS NOT NULL THEN
    EXECUTE 'SELECT EXISTS (SELECT 1 FROM cron.job WHERE jobname = $1)'
      INTO job_exists
      USING 'process-notification-queue';

    IF job_exists THEN
      EXECUTE 'SELECT cron.unschedule($1)'
        USING 'process-notification-queue';
    END IF;

    EXECUTE 'SELECT cron.schedule($1, $2, $3)'
      USING
        'process-notification-queue',
        '*/15 * * * *',
        $cron$
        SELECT extensions.http_post(
          url     := 'https://zqxjvmejoktwlcqshnwi.supabase.co/functions/v1/process-notification-queue',
          headers := '{"Content-Type": "application/json"}'::jsonb,
          body    := '{"secret": "0bab199e48c45107c88f3c09cb4b369dfdf183b1613d0f5e32c024265d9401a1"}'::jsonb
        );
        $cron$;

    RAISE NOTICE 'pg_cron job process-notification-queue planifie toutes les 15 min.';
  ELSE
    RAISE NOTICE 'pg_cron non disponible - planification process-notification-queue ignoree.';
  END IF;
END $$;
