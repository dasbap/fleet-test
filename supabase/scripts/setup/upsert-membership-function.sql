-- =====================================================
-- FONCTION UPSERT POUR FLEET_MEMBERSHIPS
-- Smart Fleet Africa
-- =====================================================
-- Cette fonction gère l'insertion ou la mise à jour atomique
-- d'un membership, évitant les erreurs de contrainte unique
-- =====================================================

CREATE OR REPLACE FUNCTION upsert_fleet_membership(
  p_fleet_id uuid,
  p_user_id uuid,
  p_role role_type,
  p_is_active boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_membership_id uuid;
BEGIN
  -- Tentative d'insertion avec gestion du conflit
  INSERT INTO flotte_adhesions (fleet_id, user_id, role, is_active)
  VALUES (p_fleet_id, p_user_id, p_role, p_is_active)
  ON CONFLICT (fleet_id, user_id, role)
  DO UPDATE SET
    is_active = p_is_active,
    created_at = CASE 
      WHEN flotte_adhesions.is_active = false AND p_is_active = true 
      THEN now() 
      ELSE flotte_adhesions.created_at 
    END
  RETURNING id INTO v_membership_id;
  
  RETURN v_membership_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION upsert_fleet_membership(uuid, uuid, role_type, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_fleet_membership(uuid, uuid, role_type, boolean) TO anon;

-- Comment
COMMENT ON FUNCTION upsert_fleet_membership(uuid, uuid, role_type, boolean) IS 
'Insère ou met à jour un membership de flotte de manière atomique. Gère les conflits de contrainte unique automatiquement.';
