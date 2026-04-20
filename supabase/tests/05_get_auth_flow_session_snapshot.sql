-- Vérifications ciblées pour get_auth_flow_session_snapshot (contrat JSON aligné avec auth-flow.ts).
DO $$
DECLARE
  v_src text;
BEGIN
  IF to_regprocedure('public.get_auth_flow_session_snapshot(uuid)') IS NULL THEN
    RAISE EXCEPTION 'RPC manquant: public.get_auth_flow_session_snapshot(uuid)';
  END IF;

  SELECT pg_get_functiondef(p.oid)
  INTO v_src
  FROM pg_proc p
  INNER JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'get_auth_flow_session_snapshot'
    AND p.pronargs = 1;

  IF v_src IS NULL OR v_src = '' THEN
    RAISE EXCEPTION 'Impossible de lire la définition de get_auth_flow_session_snapshot';
  END IF;

  IF position('lapsed_paid' IN v_src) = 0 THEN
    RAISE EXCEPTION 'Contrat JSON attendu: clef lapsed_paid absente du corps SQL';
  END IF;

  IF position('onboarding_completed' IN v_src) = 0 THEN
    RAISE EXCEPTION 'Contrat JSON attendu: clef onboarding_completed absente du corps SQL';
  END IF;

  IF position('has_memberships' IN v_src) = 0 THEN
    RAISE EXCEPTION 'Contrat JSON attendu: clef has_memberships absente du corps SQL';
  END IF;
END $$;
