BEGIN;

DO $$
DECLARE
  function_signature regprocedure;
BEGIN
  SELECT p.oid::regprocedure
  INTO function_signature
  FROM pg_proc AS p
  JOIN pg_namespace AS n
    ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'creer_flotte_esamba'
  ORDER BY p.oid
  LIMIT 1;

  IF function_signature IS NULL THEN
    RAISE EXCEPTION
      'Fonction public.creer_flotte_esamba introuvable';
  END IF;

  EXECUTE format(
    'GRANT EXECUTE ON FUNCTION %s TO service_role',
    function_signature
  );
END;
$$;

COMMIT;