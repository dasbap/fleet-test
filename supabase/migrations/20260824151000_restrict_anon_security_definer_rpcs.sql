BEGIN;

DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT
      p.oid,
      n.nspname AS schema_name,
      p.proname AS function_name,
      pg_get_function_identity_arguments(p.oid) AS identity_arguments
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND NOT (
        p.proname = 'valider_code_invitation'
        AND pg_get_function_identity_arguments(p.oid) = 'p_code text'
      )
      AND NOT (
        p.proname = 'access_code_validate'
        AND pg_get_function_identity_arguments(p.oid) = 'p_code text'
      )
      AND p.proname NOT IN ('is_platform_admin', 'is_platform_super_admin')
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC, anon',
      fn.schema_name,
      fn.function_name,
      fn.identity_arguments
    );
  END LOOP;
END $$;

DO $$
BEGIN
  IF to_regprocedure('public.affecter_vehicule(uuid,uuid,uuid,timestamp with time zone)') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.affecter_vehicule(uuid, uuid, uuid, timestamptz)
      FROM PUBLIC, anon;
    GRANT EXECUTE ON FUNCTION public.affecter_vehicule(uuid, uuid, uuid, timestamptz)
      TO authenticated;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

COMMIT;
