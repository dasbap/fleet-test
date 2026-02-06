-- =====================================================
-- RPC FUNCTION: add_member_by_email
-- Ajoute un membre à une flotte en utilisant son email
-- Smart Fleet Africa
-- =====================================================

DROP FUNCTION IF EXISTS public.add_member_by_email(uuid, text, role_type);

CREATE OR REPLACE FUNCTION public.add_member_by_email(
  p_fleet_id uuid,
  p_email text,
  p_role role_type
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_membership_id uuid;
BEGIN
  -- Vérifier que la flotte existe
  IF NOT EXISTS (SELECT 1 FROM flottes WHERE id = p_fleet_id) THEN
    RAISE EXCEPTION 'Fleet not found: %', p_fleet_id;
  END IF;

  -- Vérifier que l'utilisateur appelant a les permissions (manager ou organizer)
  IF NOT EXISTS (
    SELECT 1
    FROM flotte_adhesions fm
    WHERE fm.fleet_id = p_fleet_id
      AND fm.user_id = auth.uid()
      AND fm.role IN ('manager', 'organizer')
      AND fm.is_active = true
  ) THEN
    RAISE EXCEPTION 'Permission denied: You must be a manager or organizer to add members.';
  END IF;

  -- Trouver l'utilisateur par email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_email
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found with email: %', p_email;
  END IF;

  -- Utiliser upsert_fleet_membership pour gérer les conflits de manière atomique
  SELECT public.upsert_fleet_membership(p_fleet_id, v_user_id, p_role, true) INTO v_membership_id;

  RETURN v_membership_id;
END;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION public.add_member_by_email(uuid, text, role_type) TO authenticated;

COMMENT ON FUNCTION public.add_member_by_email(uuid, text, role_type) IS 
'Ajoute un membre à une flotte en utilisant son email. Nécessite que l''utilisateur appelant soit manager ou organizer.';
