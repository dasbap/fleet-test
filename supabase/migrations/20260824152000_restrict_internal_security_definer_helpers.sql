BEGIN;

DO $$
BEGIN
  IF to_regprocedure('public.write_audit_log(text,uuid,uuid,jsonb,uuid)') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.write_audit_log(text, uuid, uuid, jsonb, uuid)
      FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.write_audit_log(text, uuid, uuid, jsonb, uuid)
      TO service_role;
  END IF;
END $$;

DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT
      n.nspname AS schema_name,
      p.proname AS function_name,
      pg_get_function_identity_arguments(p.oid) AS identity_args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND p.prorettype IN ('trigger'::regtype, 'event_trigger'::regtype)
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC, anon, authenticated',
      fn.schema_name,
      fn.function_name,
      fn.identity_args
    );
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';

COMMIT;
