-- Restore service_role table privileges needed by local replay integration seeds.
-- RLS stays unchanged for anon/authenticated users; service_role remains the
-- backend-only credential used by CI and Edge Functions.

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'public.organisations',
    'public.profils',
    'public.flottes',
    'public.flotte_adhesions',
    'public.vehicules',
    'public.controles_journaliers',
    'public.alertes_automatiques',
    'public.plans',
    'public.paiements',
    'public.payment_attempts',
    'public.abonnements',
    'public.billing_events',
    'public.notification_queue',
    'public.jetons_qr',
    'public.droits_vehicules'
  ] LOOP
    IF to_regclass(table_name) IS NOT NULL THEN
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE %s TO service_role', table_name);
    END IF;
  END LOOP;
END;
$$;

NOTIFY pgrst, 'reload schema';
