-- =====================================================
-- RPC FUNCTION: create_esamba_invitation
-- Crée une invitation ESAMBA en contournant les problèmes RLS
-- Smart Fleet Africa
-- =====================================================
-- Cette fonction permet de créer une invitation même si
-- l'utilisateur n'a pas encore le membership actif
-- (utile lors de la création initiale des données ESAMBA)
-- =====================================================

DROP FUNCTION IF EXISTS public.create_esamba_invitation(
  p_fleet_id uuid,
  p_code text
);

CREATE OR REPLACE FUNCTION public.create_esamba_invitation(
  p_fleet_id uuid,
  p_code text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation_code text;
BEGIN
  -- Vérifier que la flotte existe
  IF NOT EXISTS (SELECT 1 FROM flottes WHERE id = p_fleet_id) THEN
    RAISE EXCEPTION 'Fleet not found: %', p_fleet_id;
  END IF;

  -- Vérifier si l'invitation existe déjà
  SELECT code INTO v_invitation_code
  FROM flotte_invitations
  WHERE fleet_id = p_fleet_id
    AND code = p_code
    LIMIT 1;

  -- Si l'invitation existe déjà, retourner son code
  IF v_invitation_code IS NOT NULL THEN
    RETURN v_invitation_code;
  END IF;

  -- Créer l'invitation
  INSERT INTO flotte_invitations (
    fleet_id,
    code,
    current_uses,
    created_by
  )
  VALUES (
    p_fleet_id,
    p_code,
    0,
    auth.uid()
  )
  ON CONFLICT (code)
  DO UPDATE SET
    fleet_id = EXCLUDED.fleet_id,
    current_uses = COALESCE(EXCLUDED.current_uses, flotte_invitations.current_uses)
  RETURNING code INTO v_invitation_code;

  RETURN v_invitation_code;
END;
$$;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
-- Donner les permissions d'exécution aux utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION public.create_esamba_invitation(uuid, text) TO authenticated;

-- Commentaire
COMMENT ON FUNCTION public.create_esamba_invitation(uuid, text) IS 
'Crée une invitation ESAMBA en contournant les problèmes RLS. Utilise SECURITY DEFINER pour permettre la création même si le membership n''est pas encore actif.';
