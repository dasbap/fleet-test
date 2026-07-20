-- =====================================================
-- Migration: Renommer les fonctions RPC en français
-- Date: 2025-02-06
-- Description: Renomme toutes les fonctions RPC anglaises vers leurs équivalents français
-- =====================================================

-- 1. Renommer create_esamba_fleet → creer_flotte_esamba
-- =====================================================

-- Créer la nouvelle fonction avec le nom français
CREATE OR REPLACE FUNCTION public.creer_flotte_esamba(
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
    RAISE EXCEPTION 'Organisation introuvable : %', p_org_id;
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

GRANT EXECUTE ON FUNCTION public.creer_flotte_esamba(uuid, text, text) TO authenticated;

COMMENT ON FUNCTION public.creer_flotte_esamba(uuid, text, text) IS 
'Crée une flotte ESAMBA en contournant les problèmes RLS. Utilise SECURITY DEFINER pour permettre la création même si l''utilisateur n''a pas encore les permissions nécessaires.';

-- 2. Renommer upsert_fleet_membership → creer_ou_mettre_a_jour_adhesion_flotte
-- =====================================================

CREATE OR REPLACE FUNCTION public.creer_ou_mettre_a_jour_adhesion_flotte(
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
  -- Insertion avec gestion automatique du conflit
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

GRANT EXECUTE ON FUNCTION public.creer_ou_mettre_a_jour_adhesion_flotte(uuid, uuid, role_type, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.creer_ou_mettre_a_jour_adhesion_flotte(uuid, uuid, role_type, boolean) TO anon;

COMMENT ON FUNCTION public.creer_ou_mettre_a_jour_adhesion_flotte(uuid, uuid, role_type, boolean) IS 
'Insère ou met à jour une adhésion de flotte de manière atomique. Gère les conflits de contrainte unique automatiquement.';

-- 3. Renommer create_esamba_vehicle → creer_vehicule_esamba
-- =====================================================

CREATE OR REPLACE FUNCTION public.creer_vehicule_esamba(
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
    RAISE EXCEPTION 'Flotte introuvable : %', p_fleet_id;
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

GRANT EXECUTE ON FUNCTION public.creer_vehicule_esamba(uuid, text, text, text, integer, integer) TO authenticated;

COMMENT ON FUNCTION public.creer_vehicule_esamba(uuid, text, text, text, integer, integer) IS 
'Crée un véhicule ESAMBA en contournant les problèmes RLS. Utilise SECURITY DEFINER pour permettre la création même si le membership n''est pas encore actif.';

-- 4. Renommer create_esamba_invitation → creer_invitation_esamba
-- =====================================================

CREATE OR REPLACE FUNCTION public.creer_invitation_esamba(
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
    RAISE EXCEPTION 'Flotte introuvable : %', p_fleet_id;
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

GRANT EXECUTE ON FUNCTION public.creer_invitation_esamba(uuid, text) TO authenticated;

COMMENT ON FUNCTION public.creer_invitation_esamba(uuid, text) IS 
'Crée une invitation ESAMBA en contournant les problèmes RLS. Utilise SECURITY DEFINER pour permettre la création même si le membership n''est pas encore actif.';

-- 5. Renommer check_esamba_2024 → verifier_esamba_2024
-- =====================================================

CREATE OR REPLACE FUNCTION public.verifier_esamba_2024()
RETURNS TABLE (
  organisation boolean,
  flotte boolean,
  membership_organizer boolean,
  vehicule_esamba_001 boolean,
  invitation_esamba_2024 boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    EXISTS(SELECT 1 FROM organisations WHERE name = 'Organisation ESAMBA') as organisation,
    EXISTS(SELECT 1 FROM flottes WHERE name = 'Flotte ESAMBA') as flotte,
    EXISTS(
      SELECT 1 FROM flotte_adhesions fm
      JOIN flottes f ON f.id = fm.fleet_id
      WHERE f.name = 'Flotte ESAMBA'
        AND fm.user_id = auth.uid()
        AND fm.role = 'organizer'
        AND fm.is_active = true
    ) as membership_organizer,
    EXISTS(
      SELECT 1 FROM vehicules v
      JOIN flottes f ON f.id = v.fleet_id
      WHERE f.name = 'Flotte ESAMBA'
        AND v.registration = 'ESAMBA-001'
    ) as vehicule_esamba_001,
    EXISTS(
      SELECT 1 FROM flotte_invitations fi
      JOIN flottes f ON f.id = fi.fleet_id
      WHERE f.name = 'Flotte ESAMBA'
        AND fi.code = 'ESAMBA-2024'
    ) as invitation_esamba_2024;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verifier_esamba_2024() TO authenticated;

COMMENT ON FUNCTION public.verifier_esamba_2024() IS
'Vérifie l''existence des données ESAMBA-2024. Retourne un tableau avec le statut de chaque entité.';

-- 6. Renommer add_member_by_email → ajouter_membre_par_email
-- =====================================================

CREATE OR REPLACE FUNCTION public.ajouter_membre_par_email(
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
    RAISE EXCEPTION 'Flotte introuvable : %', p_fleet_id;
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
    RAISE EXCEPTION 'Permission refusée : Vous devez être gestionnaire ou organisateur pour ajouter des membres.';
  END IF;

  -- Trouver l'utilisateur par email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_email
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur introuvable avec l''email : %', p_email;
  END IF;

  -- Utiliser creer_ou_mettre_a_jour_adhesion_flotte pour gérer les conflits de manière atomique
  SELECT public.creer_ou_mettre_a_jour_adhesion_flotte(p_fleet_id, v_user_id, p_role, true) INTO v_membership_id;

  RETURN v_membership_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ajouter_membre_par_email(uuid, text, role_type) TO authenticated;

COMMENT ON FUNCTION public.ajouter_membre_par_email(uuid, text, role_type) IS 
'Ajoute un membre à une flotte en utilisant son email. Nécessite que l''utilisateur appelant soit gestionnaire ou organisateur.';

-- 7. Renommer ensure_user_profile → assurer_profil_utilisateur
-- =====================================================

CREATE OR REPLACE FUNCTION public.assurer_profil_utilisateur()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_email text;
  v_full_name text;
  v_meta_full_name text;
  v_profile_exists boolean;
  v_result jsonb;
BEGIN
  -- Récupérer l'ID de l'utilisateur connecté
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not authenticated'
    );
  END IF;

  -- Récupérer l'email et les métadonnées de l'utilisateur
  SELECT 
    u.email,
    u.raw_user_meta_data->>'full_name'
  INTO 
    v_email,
    v_meta_full_name
  FROM auth.users u
  WHERE u.id = v_user_id;

  IF v_email IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User email not found'
    );
  END IF;

  -- Déterminer le full_name à utiliser
  v_full_name := COALESCE(
    v_meta_full_name,
    SPLIT_PART(v_email, '@', 1)
  );

  -- Vérifier si le profil existe
  SELECT EXISTS(
    SELECT 1 FROM public.profils WHERE user_id = v_user_id
  ) INTO v_profile_exists;

  -- Créer ou mettre à jour le profil
  IF v_profile_exists THEN
    -- Mettre à jour le profil existant si full_name est null
    UPDATE public.profils
    SET full_name = COALESCE(full_name, v_full_name)
    WHERE user_id = v_user_id
      AND full_name IS NULL;
    
    v_result := jsonb_build_object(
      'success', true,
      'action', 'updated',
      'full_name', v_full_name
    );
  ELSE
    -- Créer un nouveau profil
    INSERT INTO public.profils (user_id, full_name, created_at)
    VALUES (v_user_id, v_full_name, NOW());
    
    v_result := jsonb_build_object(
      'success', true,
      'action', 'created',
      'full_name', v_full_name
    );
  END IF;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.assurer_profil_utilisateur() TO authenticated;

COMMENT ON FUNCTION public.assurer_profil_utilisateur() IS 
'Assure que le profil utilisateur existe et a un full_name. Crée le profil si nécessaire, met à jour full_name si null.';

-- Note: Les anciennes fonctions seront supprimées automatiquement lors du déploiement
-- car elles ne sont plus référencées. Pour une suppression explicite, décommenter :

-- DROP FUNCTION IF EXISTS public.create_esamba_fleet(uuid, text, text);
-- DROP FUNCTION IF EXISTS public.upsert_fleet_membership(uuid, uuid, role_type, boolean);
-- DROP FUNCTION IF EXISTS public.create_esamba_vehicle(uuid, text, text, text, integer, integer);
-- DROP FUNCTION IF EXISTS public.create_esamba_invitation(uuid, text);
-- DROP FUNCTION IF EXISTS public.check_esamba_2024();
-- DROP FUNCTION IF EXISTS public.add_member_by_email(uuid, text, role_type);
-- DROP FUNCTION IF EXISTS public.ensure_user_profile();
