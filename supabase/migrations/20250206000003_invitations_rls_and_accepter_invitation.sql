-- =====================================================
-- Migration: has_role, RLS flotte_invitations, RPC accepter_invitation
-- Date: 2025-02-06
-- Permet à /dashboard/invitations de fonctionner (lecture, création, suppression)
-- =====================================================

-- 1. Fonction has_role (requise par les politiques RLS)
-- =====================================================

CREATE OR REPLACE FUNCTION public.has_role(p_flotte_id uuid, p_role role_type)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM flotte_adhesions
    WHERE fleet_id = p_flotte_id
      AND user_id = auth.uid()
      AND role = p_role
      AND is_active = true
  );
$$;

-- 2. Politiques RLS sur flotte_invitations
-- =====================================================

-- Suppression des anciennes politiques si elles existent (noms du schéma)
DROP POLICY IF EXISTS invitations_lecture_publique ON public.flotte_invitations;
DROP POLICY IF EXISTS invitations_ecriture_manager_org ON public.flotte_invitations;
DROP POLICY IF EXISTS invitations_modification_manager_org ON public.flotte_invitations;
DROP POLICY IF EXISTS invitations_suppression_manager_org ON public.flotte_invitations;

-- SELECT : lecture publique (anon + authenticated) pour validation du code à l'inscription
CREATE POLICY invitations_lecture_publique ON public.flotte_invitations
FOR SELECT TO anon, authenticated
USING (true);

-- INSERT : manager ou organizer de la flotte
CREATE POLICY invitations_ecriture_manager_org ON public.flotte_invitations
FOR INSERT TO authenticated
WITH CHECK (has_role(fleet_id, 'manager') OR has_role(fleet_id, 'organizer'));

-- UPDATE : manager ou organizer de la flotte
CREATE POLICY invitations_modification_manager_org ON public.flotte_invitations
FOR UPDATE TO authenticated
USING (has_role(fleet_id, 'manager') OR has_role(fleet_id, 'organizer'));

-- DELETE : manager ou organizer de la flotte (nécessaire pour useDeleteInvitation)
CREATE POLICY invitations_suppression_manager_org ON public.flotte_invitations
FOR DELETE TO authenticated
USING (has_role(fleet_id, 'manager') OR has_role(fleet_id, 'organizer'));

-- 3. RPC accepter_invitation
-- =====================================================

DROP FUNCTION IF EXISTS public.accepter_invitation(text);
DROP FUNCTION IF EXISTS public.accept_invitation(text);

CREATE OR REPLACE FUNCTION public.accepter_invitation(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation flotte_invitations%ROWTYPE;
  v_user_id uuid := auth.uid();
  v_membership_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO v_invitation
  FROM flotte_invitations
  WHERE code = p_code
    AND (expires_at IS NULL OR expires_at > now())
    AND (max_uses IS NULL OR current_uses < max_uses)
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invitation_not_found_or_expired');
  END IF;

  SELECT id INTO v_membership_id
  FROM flotte_adhesions
  WHERE fleet_id = v_invitation.fleet_id
    AND user_id = v_user_id
    AND is_active = true;

  IF v_membership_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'ok', true,
      'error', null,
      'fleet_id', v_invitation.fleet_id,
      'membership_id', v_membership_id,
      'message', 'already_member'
    );
  END IF;

  IF v_invitation.max_uses IS NOT NULL AND v_invitation.current_uses >= v_invitation.max_uses THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invitation_limit_reached');
  END IF;

  INSERT INTO flotte_adhesions (fleet_id, user_id, role, is_active)
  VALUES (v_invitation.fleet_id, v_user_id, 'driver', true)
  RETURNING id INTO v_membership_id;

  UPDATE flotte_invitations
  SET current_uses = current_uses + 1
  WHERE id = v_invitation.id;

  RETURN jsonb_build_object(
    'ok', true,
    'error', null,
    'fleet_id', v_invitation.fleet_id,
    'membership_id', v_membership_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.accepter_invitation(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accepter_invitation(text) TO anon;

COMMENT ON FUNCTION public.accepter_invitation(text) IS
'Accepte une invitation à rejoindre une flotte. Retourne jsonb avec ok, error, fleet_id, membership_id.';
