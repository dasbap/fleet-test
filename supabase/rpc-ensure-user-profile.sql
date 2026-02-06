-- =====================================================
-- FONCTION RPC : ensure_user_profile
-- Corrige automatiquement le profil utilisateur
-- Smart Fleet Africa
-- =====================================================
-- Cette fonction :
-- 1. Crée le profil s'il n'existe pas
-- 2. Met à jour full_name si null en utilisant l'email
-- 3. S'exécute de manière sécurisée avec SECURITY DEFINER
-- =====================================================

CREATE OR REPLACE FUNCTION public.ensure_user_profile()
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
    SELECT 1 FROM public.profiles WHERE user_id = v_user_id
  ) INTO v_profile_exists;

  -- Créer ou mettre à jour le profil
  IF v_profile_exists THEN
    -- Mettre à jour le profil existant si full_name est null
    UPDATE public.profiles
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
    INSERT INTO public.profiles (user_id, full_name, created_at)
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

-- Permissions
GRANT EXECUTE ON FUNCTION public.ensure_user_profile() TO authenticated;

-- Commentaire
COMMENT ON FUNCTION public.ensure_user_profile() IS 
'Assure que le profil utilisateur existe et a un full_name. Crée le profil si nécessaire, met à jour full_name si null.';
