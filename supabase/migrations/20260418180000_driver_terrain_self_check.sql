-- Migration: driver_terrain_self_check
-- RPC unifié chauffeur : retourne phone + has_ever_shift en un seul round-trip Supabase.
-- Remplace les deux requêtes parallèles (profileRepo + shiftRepo) dans useDriverTerrainActivation.
-- Gain ~300-500ms sur 2G/3G à chaque affichage de page pour les chauffeurs.

CREATE OR REPLACE FUNCTION public.driver_terrain_self_check(
  p_user_id uuid,
  p_fleet_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone       text;
  v_has_shift   boolean;
BEGIN
  -- Sécurité : l'appelant doit être le chauffeur lui-même
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'permission_denied: caller must match p_user_id';
  END IF;

  -- Téléphone depuis profils (lecture directe, pas de jointure membership nécessaire)
  SELECT phone
  INTO v_phone
  FROM profils
  WHERE user_id = p_user_id
  LIMIT 1;

  -- A-t-il au moins un créneau (toute flotte) ?
  SELECT EXISTS (
    SELECT 1
    FROM affectations_vehicules av
    INNER JOIN creneaux_conducteurs cc ON cc.assignment_id = av.id
    WHERE av.driver_user_id = p_user_id
    LIMIT 1
  ) INTO v_has_shift;

  RETURN jsonb_build_object(
    'phone',         v_phone,
    'has_ever_shift', v_has_shift
  );
END;
$$;

-- Accès : uniquement les utilisateurs authentifiés (RLS chauffeur via auth.uid check interne)
GRANT EXECUTE ON FUNCTION public.driver_terrain_self_check(uuid, uuid) TO authenticated;

COMMENT ON FUNCTION public.driver_terrain_self_check(uuid, uuid) IS
  'Retourne {phone, has_ever_shift} pour un chauffeur en un seul appel. '
  'Utilisé par useDriverTerrainActivation pour réduire les round-trips réseau (2G/3G Afrique).';
