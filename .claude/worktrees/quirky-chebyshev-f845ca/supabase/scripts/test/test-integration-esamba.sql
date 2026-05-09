-- =====================================================
-- TEST DE L'INTÉGRATION COMPLÈTE ESAMBA
-- Smart Fleet Africa - E-Samba
-- =====================================================
-- Ce script teste que tous les profils, équipes et véhicules
-- ont été correctement intégrés à l'organisation ESAMBA
-- =====================================================

-- =====================================================
-- TEST 1 : Vérification de l'organisation
-- =====================================================

SELECT 
  'TEST 1: ORGANISATION' as test,
  CASE 
    WHEN EXISTS (SELECT 1 FROM organisations WHERE name = 'Organisation ESAMBA')
       OR EXISTS (SELECT 1 FROM orgs WHERE name = 'Organisation ESAMBA')
    THEN '✅ PASSÉ'
    ELSE '❌ ÉCHOUÉ'
  END as resultat,
  COALESCE(
    (SELECT COUNT(*) FROM organisations WHERE name = 'Organisation ESAMBA'),
    (SELECT COUNT(*) FROM orgs WHERE name = 'Organisation ESAMBA'),
    0
  ) as nombre;

-- =====================================================
-- TEST 2 : Vérification de la flotte
-- =====================================================

SELECT 
  'TEST 2: FLOTTE' as test,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM flottes WHERE name = 'Flotte ESAMBA'
      UNION
      SELECT 1 FROM fleets WHERE name = 'Flotte ESAMBA'
    )
    THEN '✅ PASSÉ'
    ELSE '❌ ÉCHOUÉ'
  END as resultat,
  COALESCE(
    (SELECT COUNT(*) FROM flottes WHERE name = 'Flotte ESAMBA'),
    (SELECT COUNT(*) FROM fleets WHERE name = 'Flotte ESAMBA'),
    0
  ) as nombre;

-- =====================================================
-- TEST 3 : Vérification des véhicules
-- =====================================================

SELECT 
  'TEST 3: VÉHICULES' as test,
  CASE 
    WHEN (
      SELECT COUNT(*) FROM vehicules v
      JOIN flottes f ON f.id = v.fleet_id
      WHERE f.name = 'Flotte ESAMBA'
        AND v.registration IN ('ESAMBA-001', 'ESAMBA-002', 'ESAMBA-003')
    ) >= 3
    OR (
      SELECT COUNT(*) FROM vehicles v
      JOIN fleets f ON f.id = v.fleet_id
      WHERE f.name = 'Flotte ESAMBA'
        AND v.registration IN ('ESAMBA-001', 'ESAMBA-002', 'ESAMBA-003')
    ) >= 3
    THEN '✅ PASSÉ'
    ELSE '❌ ÉCHOUÉ'
  END as resultat,
  COALESCE(
    (SELECT COUNT(*) FROM vehicules v
     JOIN flottes f ON f.id = v.fleet_id
     WHERE f.name = 'Flotte ESAMBA'),
    (SELECT COUNT(*) FROM vehicles v
     JOIN fleets f ON f.id = v.fleet_id
     WHERE f.name = 'Flotte ESAMBA'),
    0
  ) as nombre_vehicules;

-- Liste des véhicules créés
SELECT 
  'VÉHICULES CRÉÉS' as section,
  v.registration,
  v.brand,
  v.model,
  CASE 
    WHEN v.status = 'ok' THEN '✅ OK'
    ELSE '❌ ' || v.status
  END as statut
FROM vehicules v
JOIN flottes f ON f.id = v.fleet_id
WHERE f.name = 'Flotte ESAMBA'
ORDER BY v.registration;

-- =====================================================
-- TEST 4 : Vérification des profils utilisateurs
-- =====================================================

SELECT 
  'TEST 4: PROFILS' as test,
  CASE 
    WHEN (
      SELECT COUNT(*) FROM profils
    ) >= (
      SELECT COUNT(*) FROM auth.users
    ) * 0.8  -- Au moins 80% des utilisateurs ont un profil
    OR (
      SELECT COUNT(*) FROM profiles
    ) >= (
      SELECT COUNT(*) FROM auth.users
    ) * 0.8
    THEN '✅ PASSÉ'
    ELSE '⚠️  PARTIEL'
  END as resultat,
  COALESCE(
    (SELECT COUNT(*) FROM profils),
    (SELECT COUNT(*) FROM profiles),
    0
  ) as profils_crees,
  (SELECT COUNT(*) FROM auth.users) as utilisateurs_totaux;

-- =====================================================
-- TEST 5 : Vérification des membres de la flotte
-- =====================================================

SELECT 
  'TEST 5: MEMBRES FLOTTE' as test,
  CASE 
    WHEN (
      SELECT COUNT(DISTINCT fm.user_id) FROM flotte_adhesions fm
      JOIN flottes f ON f.id = fm.fleet_id
      WHERE f.name = 'Flotte ESAMBA' AND fm.is_active = true
    ) >= 1
    OR (
      SELECT COUNT(DISTINCT fm.user_id) FROM fleet_memberships fm
      JOIN fleets f ON f.id = fm.fleet_id
      WHERE f.name = 'Flotte ESAMBA' AND fm.is_active = true
    ) >= 1
    THEN '✅ PASSÉ'
    ELSE '❌ ÉCHOUÉ'
  END as resultat,
  COALESCE(
    (SELECT COUNT(DISTINCT fm.user_id) FROM flotte_adhesions fm
     JOIN flottes f ON f.id = fm.fleet_id
     WHERE f.name = 'Flotte ESAMBA' AND fm.is_active = true),
    (SELECT COUNT(DISTINCT fm.user_id) FROM fleet_memberships fm
     JOIN fleets f ON f.id = fm.fleet_id
     WHERE f.name = 'Flotte ESAMBA' AND fm.is_active = true),
    0
  ) as membres_actifs;

-- Détails des membres par rôle
SELECT 
  'MEMBRES PAR RÔLE' as section,
  fm.role as role_code,
  CASE 
    WHEN fm.role = 'organizer' THEN 'Organisateur'
    WHEN fm.role = 'manager' THEN 'Gestionnaire'
    WHEN fm.role = 'driver' THEN 'Chauffeur'
    WHEN fm.role = 'mechanic' THEN 'Mécanicien'
    ELSE fm.role
  END as role_fr,
  COUNT(*) as nombre,
  COUNT(*) FILTER (WHERE fm.is_active = true) as actifs
FROM flotte_adhesions fm
JOIN flottes f ON f.id = fm.fleet_id
WHERE f.name = 'Flotte ESAMBA'
GROUP BY fm.role
ORDER BY 
  CASE fm.role
    WHEN 'organizer' THEN 1
    WHEN 'manager' THEN 2
    WHEN 'mechanic' THEN 3
    WHEN 'driver' THEN 4
  END;

-- =====================================================
-- TEST 6 : Vérification de l'invitation
-- =====================================================

SELECT 
  'TEST 6: INVITATION' as test,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM flotte_invitations fi
      JOIN flottes f ON f.id = fi.fleet_id
      WHERE f.name = 'Flotte ESAMBA' AND fi.code = 'ESAMBA-2024'
    )
    OR EXISTS (
      SELECT 1 FROM fleet_invitations fi
      JOIN fleets f ON f.id = fi.fleet_id
      WHERE f.name = 'Flotte ESAMBA' AND fi.code = 'ESAMBA-2024'
    )
    THEN '✅ PASSÉ'
    ELSE '❌ ÉCHOUÉ'
  END as resultat,
  COALESCE(
    (SELECT COUNT(*) FROM flotte_invitations fi
     JOIN flottes f ON f.id = fi.fleet_id
     WHERE f.name = 'Flotte ESAMBA' AND fi.code = 'ESAMBA-2024'),
    (SELECT COUNT(*) FROM fleet_invitations fi
     JOIN fleets f ON f.id = fi.fleet_id
     WHERE f.name = 'Flotte ESAMBA' AND fi.code = 'ESAMBA-2024'),
    0
  ) as nombre;

-- =====================================================
-- TEST 7 : Vérification de la fonction RPC check_esamba_2024
-- =====================================================

SELECT 
  'TEST 7: FONCTION RPC' as test,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'check_esamba_2024'
    )
    THEN '✅ PASSÉ'
    ELSE '❌ ÉCHOUÉ'
  END as resultat,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'check_esamba_2024'
    )
    THEN 'Fonction disponible'
    ELSE 'Fonction manquante'
  END as details;

-- =====================================================
-- RÉSUMÉ FINAL DES TESTS
-- =====================================================

DO $$
DECLARE
  v_org_ok boolean;
  v_fleet_ok boolean;
  v_vehicles_ok boolean;
  v_profiles_ok boolean;
  v_members_ok boolean;
  v_invitation_ok boolean;
  v_rpc_ok boolean;
  v_total_tests integer := 0;
  v_passed_tests integer := 0;
BEGIN
  -- Test 1: Organisation
  SELECT EXISTS (
    SELECT 1 FROM organisations WHERE name = 'Organisation ESAMBA'
    UNION
    SELECT 1 FROM orgs WHERE name = 'Organisation ESAMBA'
  ) INTO v_org_ok;
  
  -- Test 2: Flotte
  SELECT EXISTS (
    SELECT 1 FROM flottes WHERE name = 'Flotte ESAMBA'
    UNION
    SELECT 1 FROM fleets WHERE name = 'Flotte ESAMBA'
  ) INTO v_fleet_ok;
  
  -- Test 3: Véhicules
  SELECT (
    SELECT COUNT(*) FROM vehicules v
    JOIN flottes f ON f.id = v.fleet_id
    WHERE f.name = 'Flotte ESAMBA'
      AND v.registration IN ('ESAMBA-001', 'ESAMBA-002', 'ESAMBA-003')
  ) >= 3
  OR (
    SELECT COUNT(*) FROM vehicles v
    JOIN fleets f ON f.id = v.fleet_id
    WHERE f.name = 'Flotte ESAMBA'
      AND v.registration IN ('ESAMBA-001', 'ESAMBA-002', 'ESAMBA-003')
  ) >= 3 INTO v_vehicles_ok;
  
  -- Test 4: Profils
  SELECT (
    SELECT COUNT(*) FROM profils
  ) >= (
    SELECT COUNT(*) FROM auth.users
  ) * 0.8
  OR (
    SELECT COUNT(*) FROM profiles
  ) >= (
    SELECT COUNT(*) FROM auth.users
  ) * 0.8 INTO v_profiles_ok;
  
  -- Test 5: Membres
  SELECT (
    SELECT COUNT(DISTINCT fm.user_id) FROM flotte_adhesions fm
    JOIN flottes f ON f.id = fm.fleet_id
    WHERE f.name = 'Flotte ESAMBA' AND fm.is_active = true
  ) >= 1
  OR (
    SELECT COUNT(DISTINCT fm.user_id) FROM fleet_memberships fm
    JOIN fleets f ON f.id = fm.fleet_id
    WHERE f.name = 'Flotte ESAMBA' AND fm.is_active = true
  ) >= 1 INTO v_members_ok;
  
  -- Test 6: Invitation
  SELECT EXISTS (
    SELECT 1 FROM flotte_invitations fi
    JOIN flottes f ON f.id = fi.fleet_id
    WHERE f.name = 'Flotte ESAMBA' AND fi.code = 'ESAMBA-2024'
  )
  OR EXISTS (
    SELECT 1 FROM fleet_invitations fi
    JOIN fleets f ON f.id = fi.fleet_id
    WHERE f.name = 'Flotte ESAMBA' AND fi.code = 'ESAMBA-2024'
  ) INTO v_invitation_ok;
  
  -- Test 7: Fonction RPC
  SELECT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'check_esamba_2024'
  ) INTO v_rpc_ok;
  
  -- Compter les tests
  v_total_tests := 7;
  IF v_org_ok THEN v_passed_tests := v_passed_tests + 1; END IF;
  IF v_fleet_ok THEN v_passed_tests := v_passed_tests + 1; END IF;
  IF v_vehicles_ok THEN v_passed_tests := v_passed_tests + 1; END IF;
  IF v_profiles_ok THEN v_passed_tests := v_passed_tests + 1; END IF;
  IF v_members_ok THEN v_passed_tests := v_passed_tests + 1; END IF;
  IF v_invitation_ok THEN v_passed_tests := v_passed_tests + 1; END IF;
  IF v_rpc_ok THEN v_passed_tests := v_passed_tests + 1; END IF;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RÉSUMÉ DES TESTS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '1. Organisation ESAMBA : %', CASE WHEN v_org_ok THEN '✅' ELSE '❌' END;
  RAISE NOTICE '2. Flotte ESAMBA : %', CASE WHEN v_fleet_ok THEN '✅' ELSE '❌' END;
  RAISE NOTICE '3. Véhicules (3+) : %', CASE WHEN v_vehicles_ok THEN '✅' ELSE '❌' END;
  RAISE NOTICE '4. Profils utilisateurs : %', CASE WHEN v_profiles_ok THEN '✅' ELSE '⚠️' END;
  RAISE NOTICE '5. Membres de la flotte : %', CASE WHEN v_members_ok THEN '✅' ELSE '❌' END;
  RAISE NOTICE '6. Invitation ESAMBA-2024 : %', CASE WHEN v_invitation_ok THEN '✅' ELSE '❌' END;
  RAISE NOTICE '7. Fonction RPC check_esamba_2024 : %', CASE WHEN v_rpc_ok THEN '✅' ELSE '❌' END;
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tests réussis : % / %', v_passed_tests, v_total_tests;
  RAISE NOTICE '========================================';
  
  IF v_passed_tests = v_total_tests THEN
    RAISE NOTICE '🎉 TOUS LES TESTS SONT PASSÉS !';
  ELSIF v_passed_tests >= v_total_tests * 0.8 THEN
    RAISE NOTICE '⚠️  La plupart des tests sont passés, mais certains éléments nécessitent une attention.';
  ELSE
    RAISE NOTICE '❌ Plusieurs tests ont échoué. Vérifiez les erreurs ci-dessus.';
  END IF;
  
  RAISE NOTICE '========================================';
END $$;
