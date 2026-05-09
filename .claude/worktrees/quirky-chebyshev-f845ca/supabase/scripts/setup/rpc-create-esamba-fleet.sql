-- =====================================================
-- RPC FUNCTION: create_esamba_fleet
-- Crée la flotte ESAMBA en contournant les problèmes RLS
-- Smart Fleet Africa
-- =====================================================
-- Cette fonction permet de créer une flotte même si
-- l'utilisateur n'a pas encore les permissions nécessaires
-- (utile lors de la création initiale des données ESAMBA)
-- =====================================================

DROP FUNCTION IF EXISTS public.create_esamba_fleet(
  p_org_id uuid,
  p_name text,
  p_collection_policy text
);

CREATE OR REPLACE FUNCTION public.create_esamba_fleet(
  p_org_id uuid,
  p_name text,
  p_collection_policy text DEFAULT 'mix'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fleet_id uuid;
BEGIN
  -- Vérifier que l'organisation existe
  IF NOT EXISTS (SELECT 1 FROM organisations WHERE id = p_org_id) THEN
    RAISE EXCEPTION 'Organization not found: %', p_org_id;
  END IF;

  -- Vérifier si la flotte existe déjà
  SELECT id INTO v_fleet_id
  FROM flottes
  WHERE org_id = p_org_id
    AND name = p_name
    LIMIT 1;

  -- Si la flotte existe déjà, retourner son ID
  IF v_fleet_id IS NOT NULL THEN
    RETURN v_fleet_id;
  END IF;

  -- Créer la flotte
  INSERT INTO flottes (
    org_id,
    name,
    collection_policy
  )
  VALUES (
    p_org_id,
    p_name,
    p_collection_policy
  )
  RETURNING id INTO v_fleet_id;

  RETURN v_fleet_id;
END;
$$;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
-- Donner les permissions d'exécution aux utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION public.create_esamba_fleet(uuid, text, text) TO authenticated;

-- Commentaire
COMMENT ON FUNCTION public.create_esamba_fleet(uuid, text, text) IS 
'Crée une flotte ESAMBA en contournant les problèmes RLS. Utilise SECURITY DEFINER pour permettre la création même si l''utilisateur n''a pas encore les permissions nécessaires.';
