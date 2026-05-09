-- =====================================================
-- CRÉATION COMPLÈTE DU COMPTE TEST
-- Smart Fleet Africa
-- =====================================================
-- Ce script crée :
-- 1. L'organisation "Test Organisation"
-- 2. La flotte "Flotte Test"
-- 3. Plusieurs membres avec différents rôles
-- =====================================================
-- Exécutez ce script dans Supabase SQL Editor
-- Le script est idempotent : il peut être exécuté plusieurs fois sans erreur
-- =====================================================

BEGIN;

-- =====================================================
-- ÉTAPE 1 : Vérifier que les fonctions RPC existent
-- =====================================================

DO $$
DECLARE
  v_functions_missing text[];
BEGIN
  SELECT array_agg(proname) INTO v_functions_missing
  FROM (
    SELECT 'create_esamba_fleet' as proname
    UNION SELECT 'upsert_fleet_membership'
    UNION SELECT 'add_member_by_email'
  ) required
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = required.proname
  );

  IF v_functions_missing IS NOT NULL AND array_length(v_functions_missing, 1) > 0 THEN
    RAISE EXCEPTION 'Fonctions RPC manquantes : %. Veuillez les créer d''abord.', array_to_string(v_functions_missing, ', ');
  END IF;

  RAISE NOTICE '✅ Toutes les fonctions RPC nécessaires sont présentes';
END $$;

-- =====================================================
-- ÉTAPE 2 : Créer ou récupérer l'organisation "Test Organisation"
-- =====================================================

DO $$
DECLARE
  v_org_id uuid;
BEGIN
  -- Vérifier si l'organisation existe déjà
  SELECT id INTO v_org_id
  FROM organisations
  WHERE name = 'Test Organisation'
  LIMIT 1;

  IF v_org_id IS NULL THEN
    -- Créer l'organisation
    INSERT INTO organisations (name, country_code)
    VALUES ('Test Organisation', 'CM')
    RETURNING id INTO v_org_id;
    RAISE NOTICE '✅ Organisation "Test Organisation" créée : %', v_org_id;
  ELSE
    RAISE NOTICE 'ℹ️  Organisation "Test Organisation" existe déjà : %', v_org_id;
  END IF;
END $$;

-- =====================================================
-- ÉTAPE 3 : Créer ou récupérer la flotte "Flotte Test"
-- =====================================================

DO $$
DECLARE
  v_org_id uuid;
  v_fleet_id uuid;
BEGIN
  -- Récupérer l'ID de l'organisation
  SELECT id INTO v_org_id
  FROM organisations
  WHERE name = 'Test Organisation'
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Organisation "Test Organisation" non trouvée. Vérifiez l''étape 2.';
  END IF;

  -- Vérifier si la flotte existe déjà
  SELECT id INTO v_fleet_id
  FROM flottes
  WHERE org_id = v_org_id
    AND name = 'Flotte Test'
  LIMIT 1;

  IF v_fleet_id IS NULL THEN
    -- Créer la flotte directement (car les fonctions RPC peuvent utiliser les noms anglais)
    INSERT INTO flottes (org_id, name, collection_policy)
    VALUES (v_org_id, 'Flotte Test', 'mix')
    RETURNING id INTO v_fleet_id;
    
    IF v_fleet_id IS NULL THEN
      RAISE EXCEPTION 'Erreur lors de la création de la flotte "Flotte Test"';
    END IF;
    
    RAISE NOTICE '✅ Flotte "Flotte Test" créée : %', v_fleet_id;
  ELSE
    RAISE NOTICE 'ℹ️  Flotte "Flotte Test" existe déjà : %', v_fleet_id;
  END IF;
END $$;

-- =====================================================
-- ÉTAPE 4 : Ajouter les membres avec différents rôles
-- =====================================================

DO $$
DECLARE
  v_fleet_id uuid;
  v_org_id uuid;
  v_user_id uuid;
  v_current_user_id uuid;
  v_membership_id uuid;
  v_members_added integer := 0;
  v_members_skipped integer := 0;
  v_test_email text := 'test@example.com';
BEGIN
  -- Récupérer l'ID de la flotte
  SELECT id INTO v_fleet_id
  FROM flottes
  WHERE name = 'Flotte Test'
  LIMIT 1;

  IF v_fleet_id IS NULL THEN
    RAISE EXCEPTION 'Flotte "Flotte Test" non trouvée. Vérifiez l''étape 3.';
  END IF;

  -- Récupérer l'utilisateur courant (si authentifié)
  v_current_user_id := auth.uid();

  RAISE NOTICE '========================================';
  RAISE NOTICE 'AJOUT DES MEMBRES À LA FLOTTE TEST';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Fleet ID : %', v_fleet_id;

  -- 1. Ajouter l'utilisateur courant comme organizer (s'il existe et n'est pas déjà membre)
  IF v_current_user_id IS NOT NULL THEN
    -- Vérifier s'il est déjà membre
    IF NOT EXISTS (
      SELECT 1 FROM flotte_adhesions 
      WHERE fleet_id = v_fleet_id 
        AND user_id = v_current_user_id
        AND is_active = true
    ) THEN
      -- Créer le membership directement dans la table française
      INSERT INTO flotte_adhesions (fleet_id, user_id, role, is_active)
      VALUES (v_fleet_id, v_current_user_id, 'organizer'::role_type, true)
      ON CONFLICT (fleet_id, user_id, role)
      DO UPDATE SET is_active = true
      RETURNING id INTO v_membership_id;
      IF v_membership_id IS NOT NULL THEN
        v_members_added := v_members_added + 1;
        RAISE NOTICE '✅ Utilisateur courant ajouté comme organizer';
      END IF;
    ELSE
      v_members_skipped := v_members_skipped + 1;
      RAISE NOTICE 'ℹ️  Utilisateur courant déjà membre de la flotte';
    END IF;
  ELSE
    RAISE NOTICE '⚠️  Aucun utilisateur authentifié (auth.uid() est NULL)';
  END IF;

  -- 2. Ajouter test@example.com comme driver
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_test_email
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    -- Vérifier s'il est déjà membre
    IF NOT EXISTS (
      SELECT 1 FROM flotte_adhesions 
      WHERE fleet_id = v_fleet_id 
        AND user_id = v_user_id
        AND role = 'driver'
        AND is_active = true
    ) THEN
      -- Créer le membership directement dans la table française
      INSERT INTO flotte_adhesions (fleet_id, user_id, role, is_active)
      VALUES (v_fleet_id, v_user_id, 'driver'::role_type, true)
      ON CONFLICT (fleet_id, user_id, role)
      DO UPDATE SET is_active = true
      RETURNING id INTO v_membership_id;
      IF v_membership_id IS NOT NULL THEN
        v_members_added := v_members_added + 1;
        RAISE NOTICE '✅ % ajouté comme driver', v_test_email;
      END IF;
    ELSE
      v_members_skipped := v_members_skipped + 1;
      RAISE NOTICE 'ℹ️  % déjà membre avec le rôle driver', v_test_email;
    END IF;
  ELSE
    RAISE NOTICE '⚠️  Utilisateur % non trouvé dans auth.users. Créez-le d''abord dans Supabase Auth.', v_test_email;
  END IF;

  -- 3. Ajouter d'autres utilisateurs existants avec différents rôles (si disponibles)
  -- Manager : premier utilisateur disponible (hors ceux déjà ajoutés)
  SELECT u.id INTO v_user_id
  FROM auth.users u
  WHERE u.id != COALESCE(v_current_user_id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND u.id != COALESCE((SELECT id FROM auth.users WHERE email = v_test_email LIMIT 1), '00000000-0000-0000-0000-000000000000'::uuid)
    AND NOT EXISTS (
      SELECT 1 FROM flotte_adhesions fm
      WHERE fm.fleet_id = v_fleet_id
        AND fm.user_id = u.id
        AND fm.is_active = true
    )
  ORDER BY u.created_at DESC
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    -- Créer le membership directement dans la table française
    INSERT INTO flotte_adhesions (fleet_id, user_id, role, is_active)
    VALUES (v_fleet_id, v_user_id, 'manager'::role_type, true)
    ON CONFLICT (fleet_id, user_id, role)
    DO UPDATE SET is_active = true
    RETURNING id INTO v_membership_id;
    IF v_membership_id IS NOT NULL THEN
      v_members_added := v_members_added + 1;
      SELECT email INTO v_test_email FROM auth.users WHERE id = v_user_id LIMIT 1;
      RAISE NOTICE '✅ % ajouté comme manager', v_test_email;
    END IF;
  END IF;

  -- Mechanic : deuxième utilisateur disponible (hors ceux déjà ajoutés)
  SELECT u.id INTO v_user_id
  FROM auth.users u
  WHERE u.id != COALESCE(v_current_user_id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND u.id != COALESCE((SELECT id FROM auth.users WHERE email = 'test@example.com' LIMIT 1), '00000000-0000-0000-0000-000000000000'::uuid)
    AND NOT EXISTS (
      SELECT 1 FROM flotte_adhesions fm
      WHERE fm.fleet_id = v_fleet_id
        AND fm.user_id = u.id
        AND fm.is_active = true
    )
  ORDER BY u.created_at DESC
  LIMIT 1 OFFSET 1;

  IF v_user_id IS NOT NULL THEN
    -- Créer le membership directement dans la table française
    INSERT INTO flotte_adhesions (fleet_id, user_id, role, is_active)
    VALUES (v_fleet_id, v_user_id, 'mechanic'::role_type, true)
    ON CONFLICT (fleet_id, user_id, role)
    DO UPDATE SET is_active = true
    RETURNING id INTO v_membership_id;
    IF v_membership_id IS NOT NULL THEN
      v_members_added := v_members_added + 1;
      SELECT email INTO v_test_email FROM auth.users WHERE id = v_user_id LIMIT 1;
      RAISE NOTICE '✅ % ajouté comme mechanic', v_test_email;
    END IF;
  END IF;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'RÉSUMÉ :';
  RAISE NOTICE '  Membres ajoutés : %', v_members_added;
  RAISE NOTICE '  Membres ignorés (déjà présents) : %', v_members_skipped;
  RAISE NOTICE '========================================';

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ ERREUR lors de l''ajout des membres : %', SQLERRM;
    RAISE;
END $$;

-- =====================================================
-- ÉTAPE 5 : Rapport final
-- =====================================================

SELECT 
  'RAPPORT FINAL - COMPTE TEST' as section,
  o.id as org_id,
  o.name as org_name,
  o.country_code,
  f.id as fleet_id,
  f.name as fleet_name,
  f.collection_policy,
  COUNT(DISTINCT fm.id) FILTER (WHERE fm.is_active = true) as total_membres_actifs,
  COUNT(DISTINCT fm.id) FILTER (WHERE fm.is_active = true AND fm.role = 'organizer') as organizers,
  COUNT(DISTINCT fm.id) FILTER (WHERE fm.is_active = true AND fm.role = 'manager') as managers,
  COUNT(DISTINCT fm.id) FILTER (WHERE fm.is_active = true AND fm.role = 'driver') as drivers,
  COUNT(DISTINCT fm.id) FILTER (WHERE fm.is_active = true AND fm.role = 'mechanic') as mechanics
FROM organisations o
JOIN flottes f ON f.org_id = o.id
LEFT JOIN flotte_adhesions fm ON fm.fleet_id = f.id
WHERE o.name = 'Test Organisation'
  AND f.name = 'Flotte Test'
GROUP BY o.id, o.name, o.country_code, f.id, f.name, f.collection_policy;

-- =====================================================
-- ÉTAPE 6 : Liste détaillée des membres
-- =====================================================

SELECT 
  'LISTE DES MEMBRES - FLOTTE TEST' as section,
  fm.id as membership_id,
  fm.role,
  fm.is_active,
  u.email,
  COALESCE(p.full_name, 'Non défini') as full_name,
  fm.created_at
FROM flotte_adhesions fm
JOIN flottes f ON f.id = fm.fleet_id
LEFT JOIN auth.users u ON u.id = fm.user_id
LEFT JOIN profils p ON p.user_id = fm.user_id
WHERE f.name = 'Flotte Test'
ORDER BY 
  CASE fm.role
    WHEN 'organizer' THEN 1
    WHEN 'manager' THEN 2
    WHEN 'driver' THEN 3
    WHEN 'mechanic' THEN 4
  END,
  fm.created_at DESC;

COMMIT;

-- Message final
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ CRÉATION DU COMPTE TEST TERMINÉE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Prochaines étapes :';
  RAISE NOTICE '1. Vérifiez les données avec : verify-test-account.sql';
  RAISE NOTICE '2. Testez via l''interface : http://localhost:8080/dashboard/teams';
  RAISE NOTICE '3. Consultez le guide : GUIDE-TEST-ACCOUNT.md';
  RAISE NOTICE '========================================';
END $$;
