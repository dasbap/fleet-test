-- Verification lecture seule apres vidage des donnees applicatives.

DO $$
DECLARE
  v_auth_users_count bigint;
  v_migrations_count bigint;
  v_remaining bigint;
  v_nonempty_tables text[] := ARRAY[]::text[];
  v_table record;
BEGIN
  SELECT count(*) INTO v_auth_users_count FROM auth.users;

  IF v_auth_users_count < 1 THEN
    RAISE EXCEPTION 'Verification failed: auth.users is empty or inaccessible';
  END IF;

  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    SELECT count(*) INTO v_migrations_count FROM supabase_migrations.schema_migrations;
  ELSE
    v_migrations_count := NULL;
  END IF;

  FOR v_table IN
    SELECT n.nspname, c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
      AND NOT EXISTS (
        SELECT 1
        FROM pg_depend d
        WHERE d.objid = c.oid
          AND d.deptype = 'e'
      )
    ORDER BY c.relname
  LOOP
    EXECUTE format('SELECT count(*) FROM %I.%I', v_table.nspname, v_table.relname)
      INTO v_remaining;
    IF v_remaining <> 0 THEN
      v_nonempty_tables := array_append(
        v_nonempty_tables,
        format('%I.%I=%s', v_table.nspname, v_table.relname, v_remaining)
      );
    END IF;
  END LOOP;

  IF array_length(v_nonempty_tables, 1) IS NOT NULL THEN
    RAISE EXCEPTION 'Verification failed: non-empty public tables: %',
      array_to_string(v_nonempty_tables, ', ');
  END IF;

  RAISE NOTICE 'Verification ok: public tables are empty; auth.users=%; migrations=%.',
    v_auth_users_count,
    v_migrations_count;
END $$;
