-- =====================================================
-- RPC FUNCTION: create_esamba_vehicle
-- Crée un véhicule ESAMBA en contournant les problèmes RLS
-- Smart Fleet Africa
-- =====================================================
-- Cette fonction permet de créer un véhicule même si
-- l'utilisateur n'a pas encore le membership actif
-- (utile lors de la création initiale des données ESAMBA)
-- =====================================================

DROP FUNCTION IF EXISTS public.create_esamba_vehicle(
  p_fleet_id uuid,
  p_registration text,
  p_brand text,
  p_model text,
  p_year integer,
  p_current_km integer
);

CREATE OR REPLACE FUNCTION public.create_esamba_vehicle(
  p_fleet_id uuid,
  p_registration text,
  p_brand text DEFAULT NULL,
  p_model text DEFAULT NULL,
  p_year integer DEFAULT NULL,
  p_current_km integer DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vehicle_id uuid;
BEGIN
  -- Vérifier que la flotte existe
  IF NOT EXISTS (SELECT 1 FROM flottes WHERE id = p_fleet_id) THEN
    RAISE EXCEPTION 'Fleet not found: %', p_fleet_id;
  END IF;

  -- Vérifier si le véhicule existe déjà
  SELECT id INTO v_vehicle_id
  FROM vehicules
  WHERE fleet_id = p_fleet_id
    AND registration = p_registration
    LIMIT 1;

  -- Si le véhicule existe déjà, retourner son ID
  IF v_vehicle_id IS NOT NULL THEN
    RETURN v_vehicle_id;
  END IF;

  -- Créer le véhicule
  INSERT INTO vehicules (
    fleet_id,
    registration,
    brand,
    model,
    year,
    current_km,
    status
  )
  VALUES (
    p_fleet_id,
    p_registration,
    p_brand,
    p_model,
    p_year,
    p_current_km,
    'ok'
  )
  ON CONFLICT (fleet_id, registration)
  DO UPDATE SET
    brand = COALESCE(EXCLUDED.brand, vehicules.brand),
    model = COALESCE(EXCLUDED.model, vehicules.model),
    year = COALESCE(EXCLUDED.year, vehicules.year),
    current_km = COALESCE(EXCLUDED.current_km, vehicules.current_km)
  RETURNING id INTO v_vehicle_id;

  RETURN v_vehicle_id;
END;
$$;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
-- Donner les permissions d'exécution aux utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION public.create_esamba_vehicle(uuid, text, text, text, integer, integer) TO authenticated;

-- Commentaire
COMMENT ON FUNCTION public.create_esamba_vehicle(uuid, text, text, text, integer, integer) IS 
'Crée un véhicule ESAMBA en contournant les problèmes RLS. Utilise SECURITY DEFINER pour permettre la création même si le membership n''est pas encore actif.';
