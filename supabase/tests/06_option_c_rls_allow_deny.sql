-- Option C - Test de non-régression RLS (sanity check)
-- Objectif: garantir que les tables critiques de migration restent protégées par RLS.

DO $$
DECLARE
  v_missing_rls text;
  v_missing_policies text;
BEGIN
  WITH expected_tables AS (
    SELECT unnest(array[
      'organisations',
      'flottes',
      'flotte_adhesions',
      'vehicules',
      'abonnements',
      'droits_vehicules',
      'jetons_qr'
    ]) AS table_name
  ),
  rls_disabled AS (
    SELECT e.table_name
    FROM expected_tables e
    JOIN pg_class c ON c.relname = e.table_name
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relrowsecurity = false
  ),
  policy_counts AS (
    SELECT tablename, count(*) AS c
    FROM pg_policies
    WHERE schemaname = 'public'
    GROUP BY tablename
  ),
  without_policy AS (
    SELECT e.table_name
    FROM expected_tables e
    LEFT JOIN policy_counts p ON p.tablename = e.table_name
    WHERE coalesce(p.c, 0) = 0
  )
  SELECT string_agg(table_name, ', ') INTO v_missing_rls FROM rls_disabled;

  WITH expected_tables AS (
    SELECT unnest(array[
      'organisations',
      'flottes',
      'flotte_adhesions',
      'vehicules',
      'abonnements',
      'droits_vehicules',
      'jetons_qr'
    ]) AS table_name
  ),
  policy_counts AS (
    SELECT tablename, count(*) AS c
    FROM pg_policies
    WHERE schemaname = 'public'
    GROUP BY tablename
  ),
  without_policy AS (
    SELECT e.table_name
    FROM expected_tables e
    LEFT JOIN policy_counts p ON p.tablename = e.table_name
    WHERE coalesce(p.c, 0) = 0
  )
  SELECT string_agg(table_name, ', ') INTO v_missing_policies FROM without_policy;

  IF v_missing_rls IS NOT NULL THEN
    RAISE EXCEPTION 'RLS désactivé sur: %', v_missing_rls;
  END IF;

  IF v_missing_policies IS NOT NULL THEN
    RAISE EXCEPTION 'Aucune policy sur: %', v_missing_policies;
  END IF;
END $$;
