-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 20260517000007 — Validation fleet_id dans prospect_create_account
--
-- Problème : quand p_fleet_id est fourni explicitement, la fonction acceptait
-- n'importe quelle flotte sans vérifier is_demo = true.
-- La sélection automatique (prospect_get_demo_fleet_id) filtrait bien sur
-- is_demo, mais le chemin explicite ne le faisait pas.
--
-- Correction : RAISE EXCEPTION 'not_a_demo_fleet' si la flotte fournie
-- n'existe pas ou n'est pas marquée is_demo = true.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.prospect_create_account(
  p_user_id      uuid,
  p_email        text,
  p_company_name text  DEFAULT NULL,
  p_invited_by   uuid  DEFAULT NULL,
  p_fleet_id     uuid  DEFAULT NULL,
  p_trial_days   int   DEFAULT 7
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fleet_id  uuid;
  v_reg_id    uuid;
  v_trial_end timestamptz;
BEGIN
  -- Sélectionner la flotte démo (paramètre ou auto-sélection)
  v_fleet_id := COALESCE(p_fleet_id, prospect_get_demo_fleet_id());

  IF v_fleet_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'no_demo_fleet_available'
    );
  END IF;

  -- Défense en profondeur : garantir que la flotte cible est bien une flotte démo.
  -- Protège contre un admin compromis qui fournirait un fleet_id de production.
  IF NOT EXISTS (
    SELECT 1 FROM public.flottes WHERE id = v_fleet_id AND is_demo = true
  ) THEN
    RAISE EXCEPTION 'not_a_demo_fleet: fleet_id % n''est pas une flotte démo', v_fleet_id
      USING ERRCODE = 'P0001';
  END IF;

  v_trial_end := now() + (p_trial_days || ' days')::interval;

  -- Insérer dans demo_profiles (idempotent)
  INSERT INTO public.demo_profiles (
    user_id, demo_role, fleet_id, is_active,
    expires_at, account_type
  )
  VALUES (
    p_user_id, 'driver', v_fleet_id, true,
    v_trial_end, 'prospect'
  )
  ON CONFLICT (user_id) DO UPDATE
    SET demo_role    = 'driver',
        fleet_id     = v_fleet_id,
        is_active    = true,
        expires_at   = v_trial_end,
        account_type = 'prospect';

  -- Créer l'adhésion à la flotte démo (role driver)
  INSERT INTO public.flotte_adhesions (
    user_id, fleet_id, role, is_active
  )
  VALUES (
    p_user_id, v_fleet_id, 'driver', true
  )
  ON CONFLICT (user_id, fleet_id) DO UPDATE
    SET role      = 'driver',
        is_active = true;

  -- Enregistrement prospect
  INSERT INTO public.prospect_registrations (
    user_id, fleet_id, email, company_name,
    invited_by, trial_end, status
  )
  VALUES (
    p_user_id, v_fleet_id, p_email, p_company_name,
    p_invited_by, v_trial_end, 'active'
  )
  RETURNING id INTO v_reg_id;

  -- Audit log
  PERFORM public.demo_log_action(
    p_user_id, NULL, 'prospect_created',
    jsonb_build_object(
      'fleet_id',   v_fleet_id,
      'email',      p_email,
      'company',    p_company_name,
      'trial_end',  v_trial_end,
      'invited_by', p_invited_by
    )
  );

  RETURN jsonb_build_object(
    'ok',        true,
    'user_id',   p_user_id,
    'fleet_id',  v_fleet_id,
    'reg_id',    v_reg_id,
    'trial_end', v_trial_end
  );
END;
$$;

COMMENT ON FUNCTION public.prospect_create_account(uuid,text,text,uuid,uuid,int) IS
  'Enregistre un prospect après création auth — demo_profiles + flotte_adhesions + prospect_registrations.
   Depuis v7 : valide que fleet_id est bien is_demo=true (défense en profondeur DB).';

GRANT EXECUTE ON FUNCTION public.prospect_create_account(uuid,text,text,uuid,uuid,int) TO service_role;
