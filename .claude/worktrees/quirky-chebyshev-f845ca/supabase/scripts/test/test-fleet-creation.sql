-- =====================================================
-- TEST DE CRÉATION DE FLOTTE - Version SQL
-- Smart Fleet Africa - E-Samba
-- =====================================================
-- Ce script teste le flux complet de création d'une flotte :
-- 1. Création d'une organisation
-- 2. Création d'une flotte via RPC
-- 3. Ajout d'un utilisateur comme organizer
-- 4. Création d'un véhicule
-- 5. Création d'une invitation
-- =====================================================
-- IMPORTANT : Ce script fonctionne sans authentification
-- Il utilise le premier utilisateur disponible dans auth.users
-- =====================================================

-- =====================================================
-- ÉTAPE 0 : Afficher les utilisateurs disponibles
-- =====================================================
-- Si vous voulez utiliser un utilisateur spécifique,
-- modifiez la requête ci-dessous pour filtrer par email
-- =====================================================

SELECT 
  'UTILISATEURS DISPONIBLES' as info,
  id as user_id,
  email,
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- =====================================================
-- OPTION : Utiliser un utilisateur spécifique par email
-- =====================================================
-- Décommentez et modifiez la ligne ci-dessous pour utiliser
-- un utilisateur spécifique au lieu du premier disponible :
-- 
-- DO $$ BEGIN
--   PERFORM set_config('app.test_user_email', 'votre_email@example.com', false);
-- END $$;
-- =====================================================

-- =====================================================
-- EXÉCUTION PRINCIPALE
-- =====================================================

DO $$
DECLARE
  v_user_id uuid;
  v_user_email text;
  v_org_id uuid;
  v_fleet_id uuid;
  v_vehicle_id uuid;
  v_invitation_code text;
  v_membership_id uuid;
  v_test_org_name text := 'Test Organisation ' || to_char(now(), 'YYYYMMDDHH24MISS');
  v_test_fleet_name text := 'Test Flotte ' || to_char(now(), 'YYYYMMDDHH24MISS');
BEGIN
  -- Étape 1 : Obtenir l'ID de l'utilisateur actuel (si authentifié)
  v_user_id := auth.uid();
  
  -- Si aucun utilisateur authentifié, utiliser le premier utilisateur disponible
  IF v_user_id IS NULL THEN
    SELECT id, email INTO v_user_id, v_user_email
    FROM auth.users
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF v_user_id IS NULL THEN
      RAISE EXCEPTION 'Aucun utilisateur trouvé dans auth.users. Créez d''abord un utilisateur dans Supabase Auth (Authentication > Users).';
    END IF;
    
    RAISE NOTICE '⚠️  Aucun utilisateur authentifié. Utilisation du premier utilisateur disponible : % (%)', v_user_email, v_user_id;
  ELSE
    SELECT email INTO v_user_email
    FROM auth.users
    WHERE id = v_user_id;
    
    RAISE NOTICE '✅ Utilisateur authentifié : % (%)', v_user_email, v_user_id;
  END IF;
  
  -- Étape 2 : Créer une organisation
  INSERT INTO organisations (name, country_code)
  VALUES (v_test_org_name, 'CM')
  RETURNING id INTO v_org_id;
  
  RAISE NOTICE '✅ Organisation créée : % (ID: %)', v_test_org_name, v_org_id;
  
  -- Étape 3 : Créer une flotte via la fonction RPC
  SELECT create_esamba_fleet(v_org_id, v_test_fleet_name, 'mix') INTO v_fleet_id;
  
  IF v_fleet_id IS NULL THEN
    RAISE EXCEPTION 'Erreur lors de la création de la flotte';
  END IF;
  
  RAISE NOTICE '✅ Flotte créée : % (ID: %)', v_test_fleet_name, v_fleet_id;
  
  -- Étape 4 : Ajouter l'utilisateur comme organizer
  -- Utiliser directement INSERT avec ON CONFLICT pour éviter les problèmes d'authentification
  INSERT INTO flotte_adhesions (fleet_id, user_id, role, is_active)
  VALUES (v_fleet_id, v_user_id, 'organizer'::role_type, true)
  ON CONFLICT (fleet_id, user_id, role)
  DO UPDATE SET
    is_active = true,
    created_at = CASE 
      WHEN flotte_adhesions.is_active = false THEN now() 
      ELSE flotte_adhesions.created_at 
    END
  RETURNING id INTO v_membership_id;
  
  IF v_membership_id IS NULL THEN
    RAISE EXCEPTION 'Erreur lors de la création du membership';
  END IF;
  
  RAISE NOTICE '✅ Membership créé : % (Role: organizer)', v_membership_id;
  
  -- Étape 5 : Vérifier que le membership existe
  IF NOT EXISTS (
    SELECT 1 FROM flotte_adhesions
    WHERE fleet_id = v_fleet_id
      AND user_id = v_user_id
      AND role = 'organizer'
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Le membership n''a pas été créé correctement';
  END IF;
  
  RAISE NOTICE '✅ Membership vérifié avec succès';
  
  -- Étape 6 : Créer un véhicule via la fonction RPC
  SELECT create_esamba_vehicle(
    v_fleet_id,
    'TEST-001',
    'Toyota',
    'Corolla',
    2020,
    0
  ) INTO v_vehicle_id;
  
  IF v_vehicle_id IS NULL THEN
    RAISE EXCEPTION 'Erreur lors de la création du véhicule';
  END IF;
  
  RAISE NOTICE '✅ Véhicule créé : TEST-001 (ID: %)', v_vehicle_id;
  
  -- Étape 7 : Créer une invitation via la fonction RPC
  SELECT create_esamba_invitation(v_fleet_id, 'TEST-2024') INTO v_invitation_code;
  
  IF v_invitation_code IS NULL THEN
    RAISE EXCEPTION 'Erreur lors de la création de l''invitation';
  END IF;
  
  RAISE NOTICE '✅ Invitation créée : %', v_invitation_code;
  
  -- Étape 8 : Vérifier que toutes les données sont créées
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RÉSUMÉ DES DONNÉES CRÉÉES';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Organisation : % (ID: %)', v_test_org_name, v_org_id;
  RAISE NOTICE 'Flotte : % (ID: %)', v_test_fleet_name, v_fleet_id;
  RAISE NOTICE 'Membership : % (Role: organizer)', v_membership_id;
  RAISE NOTICE 'Véhicule : TEST-001 (ID: %)', v_vehicle_id;
  RAISE NOTICE 'Invitation : %', v_invitation_code;
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Tous les tests sont passés avec succès !';
  RAISE NOTICE '';
  RAISE NOTICE 'Pour nettoyer les données de test, exécutez :';
  RAISE NOTICE 'DELETE FROM flotte_adhesions WHERE fleet_id = ''%'';', v_fleet_id;
  RAISE NOTICE 'DELETE FROM vehicules WHERE fleet_id = ''%'';', v_fleet_id;
  RAISE NOTICE 'DELETE FROM flotte_invitations WHERE fleet_id = ''%'';', v_fleet_id;
  RAISE NOTICE 'DELETE FROM flottes WHERE id = ''%'';', v_fleet_id;
  RAISE NOTICE 'DELETE FROM organisations WHERE id = ''%'';', v_org_id;
  
END $$;

-- =====================================================
-- VÉRIFICATIONS SUPPLÉMENTAIRES
-- =====================================================

-- Vérifier que la flotte existe
SELECT 
  'Flotte créée' as test,
  id,
  name,
  org_id,
  collection_policy
FROM flottes
WHERE name LIKE 'Test Flotte %'
ORDER BY created_at DESC
LIMIT 1;

-- Vérifier que le membership existe
SELECT 
  'Membership créé' as test,
  id,
  fleet_id,
  user_id,
  role,
  is_active
FROM flotte_adhesions
WHERE fleet_id IN (
  SELECT id FROM flottes WHERE name LIKE 'Test Flotte %' ORDER BY created_at DESC LIMIT 1
)
AND role = 'organizer'
AND is_active = true;

-- Vérifier que le véhicule existe
SELECT 
  'Véhicule créé' as test,
  id,
  fleet_id,
  registration,
  brand,
  model,
  year
FROM vehicules
WHERE fleet_id IN (
  SELECT id FROM flottes WHERE name LIKE 'Test Flotte %' ORDER BY created_at DESC LIMIT 1
)
AND registration = 'TEST-001';

-- Vérifier que l'invitation existe
SELECT 
  'Invitation créée' as test,
  id,
  fleet_id,
  code,
  current_uses
FROM flotte_invitations
WHERE fleet_id IN (
  SELECT id FROM flottes WHERE name LIKE 'Test Flotte %' ORDER BY created_at DESC LIMIT 1
)
AND code = 'TEST-2024';
