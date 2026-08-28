BEGIN;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
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
      r.schema_name,
      r.function_name,
      r.identity_args
    );
  END LOOP;
END
$$;

DO $$
BEGIN
  IF to_regprocedure('public.write_audit_log(text,uuid,uuid,jsonb,uuid)') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.write_audit_log(text, uuid, uuid, jsonb, uuid)
      FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.write_audit_log(text, uuid, uuid, jsonb, uuid)
      TO service_role;
  END IF;
END
$$;

NOTIFY pgrst, 'reload schema';

COMMIT;
