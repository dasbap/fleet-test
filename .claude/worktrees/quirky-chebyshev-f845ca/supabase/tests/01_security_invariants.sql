-- Vérifie les invariants de sécurité de base.
DO $$
DECLARE
  v_exists int;
BEGIN
  SELECT COUNT(*)
  INTO v_exists
  FROM pg_proc
  WHERE pronamespace = 'public'::regnamespace
    AND proname = 'can_manage_fleet';

  IF v_exists = 0 THEN
    RAISE EXCEPTION 'helper manquant: can_manage_fleet';
  END IF;

  SELECT COUNT(*)
  INTO v_exists
  FROM pg_proc
  WHERE pronamespace = 'public'::regnamespace
    AND proname = 'can_drive_assignment';

  IF v_exists = 0 THEN
    RAISE EXCEPTION 'helper manquant: can_drive_assignment';
  END IF;

  IF to_regclass('public.v_access_matrix') IS NULL THEN
    RAISE EXCEPTION 'vue manquante: public.v_access_matrix';
  END IF;
END $$;

