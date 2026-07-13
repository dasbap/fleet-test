-- Vide les donnees applicatives du schema public sans toucher auth.users,
-- les objets de schema, les fonctions, les vues, ni l'historique de migrations.

DO $$
DECLARE
  v_auth_users_before bigint;
  v_auth_users_after bigint;
  v_migrations_before bigint;
  v_migrations_after bigint;
  v_tables text[];
  v_table_count integer;
  v_remaining bigint;
  v_table record;
BEGIN
  SELECT count(*) INTO v_auth_users_before FROM auth.users;

  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    SELECT count(*) INTO v_migrations_before FROM supabase_migrations.schema_migrations;
  ELSE
    v_migrations_before := NULL;
  END IF;

  SELECT array_agg(format('%I.%I', n.nspname, c.relname) ORDER BY c.relname)
  INTO v_tables
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind IN ('r', 'p')
    AND NOT EXISTS (
      SELECT 1
      FROM pg_depend d
      WHERE d.objid = c.oid
        AND d.deptype = 'e'
    );

  v_table_count := COALESCE(array_length(v_tables, 1), 0);

  IF v_table_count > 0 THEN
    EXECUTE 'TRUNCATE TABLE ' || array_to_string(v_tables, ', ') || ' RESTART IDENTITY CASCADE';
  END IF;

  SELECT count(*) INTO v_auth_users_after FROM auth.users;
  IF v_auth_users_after <> v_auth_users_before THEN
    RAISE EXCEPTION 'Safety check failed: auth.users count changed from % to %',
      v_auth_users_before,
      v_auth_users_after;
  END IF;

  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    SELECT count(*) INTO v_migrations_after FROM supabase_migrations.schema_migrations;
    IF v_migrations_after <> v_migrations_before THEN
      RAISE EXCEPTION 'Safety check failed: migration history count changed from % to %',
        v_migrations_before,
        v_migrations_after;
    END IF;
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
      RAISE EXCEPTION 'Safety check failed: %.% still contains % rows',
        v_table.nspname,
        v_table.relname,
        v_remaining;
    END IF;
  END LOOP;

  RAISE NOTICE 'Public data emptied: % table(s) truncated; auth.users preserved with % user(s).',
    v_table_count,
    v_auth_users_after;
END $$;
