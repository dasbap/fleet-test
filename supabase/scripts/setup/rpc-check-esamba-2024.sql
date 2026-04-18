-- =====================================================
-- RPC FUNCTION: check_esamba_2024
-- Vérifie l'intégrité des données ESAMBA pour l'import initial
-- Smart Fleet Africa
-- =====================================================

DROP FUNCTION IF EXISTS public.check_esamba_2024(
  p_org_id uuid
);

CREATE OR REPLACE FUNCTION public.check_esamba_2024(
  p_org_id uuid
)
RETURNS TABLE (
  ok boolean,
  missing_fleet boolean,
  missing_vehicles integer,
  missing_members integer,
  missing_invitations integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fleet_id uuid;
  v_missing_vehicles integer := 0;
  v_missing_members integer := 0;
  v_missing_invitations integer := 0;
  v_ok boolean := false;
BEGIN
  -- Vérifie la présence de la flotte ESAMBA associée à l'organisation
  SELECT id INTO v_fleet_id
  FROM flottes
  WHERE org_id = p_org_id
    AND name ILIKE '%esamba%'
  LIMIT 1;

  -- S'il n'y a pas de flotte, tout est absent
  IF v_fleet_id IS NULL THEN
    RETURN QUERY SELECT false, true, NULL, NULL, NULL;
    RETURN;
  END IF;

  -- Vérifier les véhicules ESAMBA (doivent exister)
  SELECT COUNT(*) INTO v_missing_vehicles
  FROM vehicules
  WHERE fleet_id = v_fleet_id;

  -- Vérifier les membres ESAMBA (doivent exister)
  SELECT COUNT(*) INTO v_missing_members
  FROM flotte_adhesions
  WHERE fleet_id = v_fleet_id
    AND is_active = true;

  -- Vérifier les invitations ESAMBA (doivent exister)
  SELECT COUNT(*) INTO v_missing_invitations
  FROM flotte_invitations
  WHERE fleet_id = v_fleet_id;

  IF v_missing_vehicles > 0 AND v_missing_members > 0 AND v_missing_invitations > 0 THEN
    v_ok := true;
  END IF;

  RETURN QUERY SELECT
    v_ok,
    false,
    v_missing_vehicles,
    v_missing_members,
    v_missing_invitations;
END;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION public.check_esamba_2024(uuid) TO authenticated;

COMMENT ON FUNCTION public.check_esamba_2024(uuid) IS 
'Vérifie de manière complète la présence de toutes les données essentielles ESAMBA pour une organisation : flotte, véhicules, membres, invitations.';