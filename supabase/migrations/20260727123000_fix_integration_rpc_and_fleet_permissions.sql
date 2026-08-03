BEGIN;

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;

GRANT SELECT ON TABLE public.flottes TO authenticated;

DO $$
DECLARE
  function_record record;
  function_found boolean := false;
BEGIN
  FOR function_record IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc AS p
    JOIN pg_namespace AS n
      ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'creer_vehicule_esamba'
  LOOP
    function_found := true;

    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION %s TO service_role',
      function_record.signature
    );
  END LOOP;

  IF NOT function_found THEN
    RAISE EXCEPTION
      'Fonction public.creer_vehicule_esamba introuvable';
  END IF;
END;
$$;

DO $$
DECLARE
  function_record record;
  function_found boolean := false;
BEGIN
  FOR function_record IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc AS p
    JOIN pg_namespace AS n
      ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'creer_flotte_esamba'
  LOOP
    function_found := true;

    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION %s TO service_role',
      function_record.signature
    );
  END LOOP;

  IF NOT function_found THEN
    RAISE EXCEPTION
      'Fonction public.creer_flotte_esamba introuvable';
  END IF;
END;
$$;

DO $$
DECLARE
  function_record record;
BEGIN
  FOR function_record IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc AS p
    JOIN pg_namespace AS n
      ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'creer_ou_mettre_a_jour_adhesion_flotte'
  LOOP
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION %s TO service_role',
      function_record.signature
    );
  END LOOP;
END;
$$;

COMMIT;