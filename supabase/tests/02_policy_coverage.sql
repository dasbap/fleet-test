-- Vérifie une couverture minimale des policies RLS.
DO $$
DECLARE
  v_missing text;
BEGIN
  WITH expected_tables AS (
    SELECT unnest(array[
      'organisations',
      'flottes',
      'flotte_adhesions',
      'flotte_invitations',
      'vehicules',
      'affectations_vehicules',
      'creneaux_conducteurs',
      'clotures_creneaux',
      'planning_creneaux',
      'incidents',
      'travaux_maintenance',
      'preuves_maintenance',
      'listes_verification_maintenance',
      'abonnements',
      'droits_vehicules',
      'jetons_qr',
      'plans',
      'notification_tokens',
      'alert_comments'
    ]) AS table_name
  ),
  policy_counts AS (
    SELECT tablename, count(*) AS c
    FROM pg_policies
    WHERE schemaname = 'public'
    GROUP BY tablename
  ),
  missing AS (
    SELECT e.table_name
    FROM expected_tables e
    LEFT JOIN policy_counts p ON p.tablename = e.table_name
    WHERE coalesce(p.c, 0) = 0
  )
  SELECT string_agg(table_name, ', ')
  INTO v_missing
  FROM missing;

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'tables sans policy: %', v_missing;
  END IF;
END $$;

