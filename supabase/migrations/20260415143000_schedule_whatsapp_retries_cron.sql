BEGIN;

DO $$
DECLARE
  v_cron_secret text;
  v_supabase_url text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
    OR NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net')
    OR NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'supabase_vault')
  THEN
    RAISE NOTICE 'Extensions cron/net/vault absentes: planification process-whatsapp-retries ignorée.';
    RETURN;
  END IF;

  SELECT decrypted_secret
  INTO v_cron_secret
  FROM vault.decrypted_secrets
  WHERE name = 'CRON_SECRET'
  ORDER BY created_at DESC
  LIMIT 1;

  v_supabase_url := current_setting('app.settings.supabase_url', true);

  IF v_cron_secret IS NULL OR v_supabase_url IS NULL THEN
    RAISE NOTICE 'CRON_SECRET ou app.settings.supabase_url manquant: planification ignorée.';
    RETURN;
  END IF;

  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname = 'process-whatsapp-retries';

  PERFORM cron.schedule(
    'process-whatsapp-retries',
    '*/2 * * * *',
    format(
      $sql$
      SELECT net.http_post(
        url := %L,
        headers := %L::jsonb,
        body := '{}'::jsonb
      );
      $sql$,
      v_supabase_url || '/functions/v1/process-whatsapp-retries',
      format('{"Content-Type":"application/json","Authorization":"Bearer %s"}', v_cron_secret)
    )
  );
END $$;

COMMIT;
