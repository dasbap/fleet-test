-- Vérifie les garde-fous de la fonction de signup invitation.
DO $$
DECLARE
  v_def text;
BEGIN
  SELECT pg_get_functiondef('public.handle_invitation_signup()'::regprocedure)
  INTO v_def;

  IF v_def IS NULL THEN
    RAISE EXCEPTION 'fonction manquante: handle_invitation_signup';
  END IF;

  -- On attend un verrouillage pour éviter les courses et un contrôle max_uses
  IF position('for update' in lower(v_def)) = 0 THEN
    RAISE EXCEPTION 'guard manquant: verrouillage FOR UPDATE';
  END IF;

  IF position('max_uses' in lower(v_def)) = 0 THEN
    RAISE EXCEPTION 'guard manquant: controle max_uses';
  END IF;

  IF position('expires_at' in lower(v_def)) = 0 THEN
    RAISE EXCEPTION 'guard manquant: controle expiration';
  END IF;
END $$;

