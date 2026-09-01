BEGIN;

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
      AND p.prokind = 'f'
      AND (
        p.prosrc ILIKE '%IF auth.role() <> ''service_role'' THEN%'
        OR p.prosrc ILIKE '%IF auth.role() != ''service_role'' THEN%'
      )
      AND NOT EXISTS (
        SELECT 1
        FROM aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) acl
        JOIN pg_roles granted_role ON granted_role.oid = acl.grantee
        WHERE granted_role.rolname = 'authenticated'
          AND acl.privilege_type = 'EXECUTE'
      )
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC, anon, authenticated',
      fn.schema_name,
      fn.function_name,
      fn.identity_args
    );

    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION %I.%I(%s) TO service_role',
      fn.schema_name,
      fn.function_name,
      fn.identity_args
    );
  END LOOP;
END;
$$;

NOTIFY pgrst, 'reload schema';

COMMIT;
