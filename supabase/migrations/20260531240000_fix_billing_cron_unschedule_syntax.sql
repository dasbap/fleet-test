-- Corrige la syntaxe PERFORM ... WHERE EXISTS (invalide en PL/pgSQL).

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'billing-lifecycle-daily') THEN
      PERFORM cron.unschedule('billing-lifecycle-daily');
    END IF;
  END IF;
EXCEPTION
  WHEN undefined_table OR undefined_object THEN
    NULL;
END $$;
