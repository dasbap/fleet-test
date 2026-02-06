-- =====================================================
-- CRÉATION ET INTÉGRATION DE L'UTILISATEUR TEST
-- Smart Fleet Africa
-- =====================================================
-- Ce script intègre l'utilisateur "utilisateur_test@example.com"
-- dans l'organisation "Test Organisation" et la flotte "Flotte Test"
-- avec le rôle organizer
-- =====================================================
-- PRÉREQUIS :
-- 1. L'utilisateur doit être créé dans Supabase Auth d'abord
--    (voir GUIDE-CREATION-UTILISATEUR-TEST.md)
-- 2. L'organisation "Test Organisation" doit exister
-- 3. La flotte "Flotte Test" doit exister
-- =====================================================
-- Exécutez ce script dans Supabase SQL Editor
-- Le script est idempotent : il peut être exécuté plusieurs fois sans erreur
-- =====================================================

BEGIN;

-- =====================================================
-- ÉTAPE 1 : Vérifier que l'organisation existe
-- =====================================================

DO $$
DECLARE
  v_org_id uuid;
  v_test_email text := 'utilisateur_test@example.com';
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CRÉATION ET INTÉGRATION UTILISATEUR TEST';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Email : %', v_test_email;
  RAISE NOTICE 'Rôle : organizer';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  -- Vérifier si l'organisation existe
  SELECT id INTO v_org_id
  FROM organisations
  WHERE name = 'Test Organisation'
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Organisation "Test Organisation" non trouvée. Exécutez d''abord create-test-account-complete.sql';
  END IF;

  RAISE NOTICE '✅ Organisation "Test Organisation" trouvée : %', v_org_id;
END $$;

-- =====================================================
-- ÉTAPE 2 : Vérifier que la flotte existe
-- =====================================================

DO $$
DECLARE
  v_org_id uuid;
  v_fleet_id uuid;
  v_test_email text := 'utilisateur_test@example.com';
BEGIN
  -- Récupérer l'ID de l'organisation
  SELECT id INTO v_org_id
  FROM organisations
  WHERE name = 'Test Organisation'
  LIMIT 1;

  -- Vérifier si la flotte existe
  SELECT id INTO v_fleet_id
  FROM flottes
  WHERE org_id = v_org_id
    AND name = 'Flotte Test'
  LIMIT 1;

  IF v_fleet_id IS NULL THEN
    RAISE EXCEPTION 'Flotte "Flotte Test" non trouvée. Exécutez d''abord create-test-account-complete.sql';
  END IF;

  RAISE NOTICE '✅ Flotte "Flotte Test" trouvée : %', v_fleet_id;
END $$;

-- =====================================================
-- ÉTAPE 3 : Vérifier que l'utilisateur existe dans auth.users
-- =====================================================

DO $$
DECLARE
  v_user_id uuid;
  v_test_email text := 'utilisateur_test@example.com';
BEGIN
  -- Vérifier si l'utilisateur existe dans auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_test_email
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  ATTENTION : Utilisateur % non trouvé dans auth.users', v_test_email;
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'INSTRUCTIONS POUR CRÉER L''UTILISATEUR';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Méthode 1 : Script PowerShell (Recommandé - Automatique)';
    RAISE NOTICE '  Exécutez dans PowerShell :';
    RAISE NOTICE '  .\scripts\create-test-user-complete.ps1';
    RAISE NOTICE '';
    RAISE NOTICE '  Ce script créera automatiquement l''utilisateur via l''API Admin';
    RAISE NOTICE '  puis vous guidera pour exécuter ce script SQL.';
    RAISE NOTICE '';
    RAISE NOTICE 'Méthode 2 : Via l''interface Supabase (Manuel)';
    RAISE NOTICE '  1. Allez sur https://app.supabase.com';
    RAISE NOTICE '  2. Sélectionnez votre projet';
    RAISE NOTICE '  3. Allez dans Authentication > Users';
    RAISE NOTICE '  4. Cliquez sur "Add user"';
    RAISE NOTICE '  5. Email : utilisateur_test@example.com';
    RAISE NOTICE '  6. Password : Test1234!@#$ (ou choisissez un mot de passe sécurisé)';
    RAISE NOTICE '  7. Cochez "Auto Confirm User"';
    RAISE NOTICE '  8. Cliquez sur "Create user"';
    RAISE NOTICE '';
    RAISE NOTICE 'Méthode 3 : Via l''API Supabase Admin (Manuel)';
    RAISE NOTICE '  Consultez GUIDE-CREATION-UTILISATEUR-TEST.md';
    RAISE NOTICE '';
    RAISE NOTICE 'Après avoir créé l''utilisateur, réexécutez ce script.';
    RAISE NOTICE '========================================';
    RAISE EXCEPTION 'Utilisateur % non trouvé. Créez-le d''abord dans Supabase Auth.', v_test_email;
  END IF;

  RAISE NOTICE '✅ Utilisateur % trouvé dans auth.users : %', v_test_email, v_user_id;
END $$;

-- =====================================================
-- ÉTAPE 4 : Vérifier que le profil existe (créé automatiquement par trigger)
-- =====================================================

DO $$
DECLARE
  v_user_id uuid;
  v_profile_exists boolean;
  v_test_email text := 'utilisateur_test@example.com';
BEGIN
  -- Récupérer l'ID de l'utilisateur
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_test_email
  LIMIT 1;

  -- Vérifier si le profil existe
  SELECT EXISTS(
    SELECT 1 FROM profils WHERE user_id = v_user_id
  ) INTO v_profile_exists;

  IF NOT v_profile_exists THEN
    -- Créer le profil manuellement (normalement créé par trigger)
    INSERT INTO profils (user_id, full_name, phone)
    VALUES (
      v_user_id,
      COALESCE(
        (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = v_user_id),
        'Utilisateur Test'
      ),
      NULL
    )
    ON CONFLICT (user_id) DO NOTHING;
    
    RAISE NOTICE '✅ Profil créé pour %', v_test_email;
  ELSE
    RAISE NOTICE '✅ Profil existe déjà pour %', v_test_email;
  END IF;
END $$;

-- =====================================================
-- ÉTAPE 5 : Ajouter l'utilisateur à la flotte avec le rôle organizer
-- =====================================================

DO $$
DECLARE
  v_user_id uuid;
  v_fleet_id uuid;
  v_org_id uuid;
  v_membership_id uuid;
  v_test_email text := 'utilisateur_test@example.com';
BEGIN
  -- Récupérer les IDs nécessaires
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_test_email
  LIMIT 1;

  SELECT id INTO v_org_id
  FROM organisations
  WHERE name = 'Test Organisation'
  LIMIT 1;

  SELECT id INTO v_fleet_id
  FROM flottes
  WHERE org_id = v_org_id
    AND name = 'Flotte Test'
  LIMIT 1;

  -- Vérifier si l'utilisateur est déjà membre
  IF EXISTS (
    SELECT 1 FROM flotte_adhesions 
    WHERE fleet_id = v_fleet_id 
      AND user_id = v_user_id
      AND role = 'organizer'
      AND is_active = true
  ) THEN
    RAISE NOTICE 'ℹ️  % est déjà membre de la flotte avec le rôle organizer', v_test_email;
  ELSE
    -- Ajouter l'utilisateur à la flotte avec le rôle organizer
    INSERT INTO flotte_adhesions (fleet_id, user_id, role, is_active)
    VALUES (v_fleet_id, v_user_id, 'organizer'::role_type, true)
    ON CONFLICT (fleet_id, user_id, role)
    DO UPDATE SET is_active = true
    RETURNING id INTO v_membership_id;

    IF v_membership_id IS NOT NULL THEN
      RAISE NOTICE '✅ % ajouté à la flotte "Flotte Test" avec le rôle organizer', v_test_email;
      RAISE NOTICE '   Membership ID : %', v_membership_id;
    ELSE
      RAISE NOTICE '⚠️  Échec de l''ajout de % à la flotte', v_test_email;
    END IF;
  END IF;
END $$;

-- =====================================================
-- ÉTAPE 6 : Rapport final avec détails
-- =====================================================

SELECT 
  'RAPPORT FINAL - UTILISATEUR TEST' as section,
  u.id as user_id,
  u.email,
  COALESCE(p.full_name, 'Non défini') as full_name,
  p.phone,
  o.name as organisation,
  f.name as flotte,
  fm.role,
  fm.is_active,
  fm.created_at as date_ajout_flotte,
  u.created_at as date_creation_compte
FROM auth.users u
LEFT JOIN profils p ON p.user_id = u.id
LEFT JOIN flotte_adhesions fm ON fm.user_id = u.id
LEFT JOIN flottes f ON f.id = fm.fleet_id
LEFT JOIN organisations o ON o.id = f.org_id
WHERE u.email = 'utilisateur_test@example.com'
  AND f.name = 'Flotte Test';

-- =====================================================
-- Message final
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ INTÉGRATION DE L''UTILISATEUR TEST TERMINÉE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Prochaines étapes :';
  RAISE NOTICE '1. Vérifiez les données avec : verify-test-user.sql';
  RAISE NOTICE '2. Testez la connexion avec utilisateur_test@example.com';
  RAISE NOTICE '3. Consultez le guide : GUIDE-CREATION-UTILISATEUR-TEST.md';
  RAISE NOTICE '========================================';
END $$;

COMMIT;
