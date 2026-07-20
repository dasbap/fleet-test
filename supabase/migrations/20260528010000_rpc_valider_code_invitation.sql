-- Migration : RPC valider_code_invitation (SECURITY DEFINER)
-- Nécessaire pour la validation pre-signup (contexte anon, RLS sur flotte_invitations
-- restreint à authenticated depuis 20260426113000_harden_membership_rpcs.sql).
-- Retourne { valid, fleet_id, fleet_name, invitation_id, reason }

CREATE OR REPLACE FUNCTION public.valider_code_invitation(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation RECORD;
BEGIN
  -- Normalisation : majuscules, trim
  p_code := upper(trim(p_code));

  SELECT
    i.id,
    i.fleet_id,
    i.expires_at,
    i.max_uses,
    i.current_uses,
    f.name AS fleet_name
  INTO v_invitation
  FROM flotte_invitations i
  JOIN flottes f ON f.id = i.fleet_id
  WHERE i.code = p_code
  LIMIT 1;

  -- Code introuvable
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'valid',  false,
      'reason', 'code_invalide'
    );
  END IF;

  -- Code expiré
  IF v_invitation.expires_at IS NOT NULL AND v_invitation.expires_at < NOW() THEN
    RETURN jsonb_build_object(
      'valid',  false,
      'reason', 'code_expire'
    );
  END IF;

  -- Quota d'utilisations atteint
  IF v_invitation.max_uses IS NOT NULL
     AND v_invitation.current_uses >= v_invitation.max_uses THEN
    RETURN jsonb_build_object(
      'valid',  false,
      'reason', 'quota_atteint'
    );
  END IF;

  RETURN jsonb_build_object(
    'valid',        true,
    'invitation_id', v_invitation.id,
    'fleet_id',     v_invitation.fleet_id,
    'fleet_name',   v_invitation.fleet_name
  );
END;
$$;

-- Accessible aux utilisateurs non authentifiés (pré-signup) et authentifiés
GRANT EXECUTE ON FUNCTION public.valider_code_invitation(TEXT) TO anon, authenticated;

COMMENT ON FUNCTION public.valider_code_invitation(TEXT) IS
  'Valide un code d''invitation sans auth (SECURITY DEFINER). '
  'Utilisé par InvitationCodeInput.tsx avant signup. '
  'Retourne { valid, invitation_id, fleet_id, fleet_name } si valide, '
  '{ valid: false, reason } sinon.';
