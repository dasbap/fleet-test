-- =====================================================
-- VÉRIFICATION COMPLÈTE DE L'UTILISATEUR TEST
-- Smart Fleet Africa
-- =====================================================
-- Ce script vérifie :
-- 1. L'existence de l'utilisateur "utilisateur_test@example.com" dans auth.users
-- 2. L'existence du profil dans profils
-- 3. L'appartenance à l'organisation "Test Organisation"
-- 4. L'appartenance à la flotte "Flotte Test"
-- 5. Le rôle organizer dans flotte_adhesions
-- =====================================================
-- Exécutez ce script dans Supabase SQL Editor
-- =====================================================

-- =====================================================
-- VÉRIFICATION 1 : Existence de l'utilisateur dans auth.users
-- =====================================================

SELECT 
  'VÉRIFICATION UTILISATEUR AUTH' as section,
  CASE 
    WHEN EXISTS (SELECT 1 FROM auth.users WHERE email = 'utilisateur_test@example.com')
    THEN '✅ Utilisateur utilisateur_test@example.com existe dans auth.users'
    ELSE '❌ Utilisateur utilisateur_test@example.com non trouvé dans auth.users'
  END as statut;

-- Détails de l'utilisateur dans auth.users
SELECT 
  'DÉTAILS UTILISATEUR AUTH' as section,
  id as user_id,
  email,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data
FROM auth.users
WHERE email = 'utilisateur_test@example.com';

-- =====================================================
-- VÉRIFICATION 2 : Existence du profil dans profils
-- =====================================================

SELECT 
  'VÉRIFICATION PROFIL' as section,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM profils p
      JOIN auth.users u ON u.id = p.user_id
      WHERE u.email = 'utilisateur_test@example.com'
    )
    THEN '✅ Profil existe pour utilisateur_test@example.com'
    ELSE '❌ Profil non trouvé pour utilisateur_test@example.com'
  END as statut;

-- Détails du profil
SELECT 
  'DÉTAILS PROFIL' as section,
  p.user_id,
  p.full_name,
  p.phone,
  p.created_at
FROM profils p
JOIN auth.users u ON u.id = p.user_id
WHERE u.email = 'utilisateur_test@example.com';

-- =====================================================
-- VÉRIFICATION 3 : Appartenance à l'organisation "Test Organisation"
-- =====================================================

SELECT 
  'VÉRIFICATION ORGANISATION' as section,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM flotte_adhesions fm
      JOIN flottes f ON f.id = fm.fleet_id
      JOIN organisations o ON o.id = f.org_id
      JOIN auth.users u ON u.id = fm.user_id
      WHERE u.email = 'utilisateur_test@example.com'
        AND o.name = 'Test Organisation'
        AND fm.is_active = true
    )
    THEN '✅ Utilisateur appartient à l''organisation "Test Organisation"'
    ELSE '❌ Utilisateur n''appartient pas à l''organisation "Test Organisation"'
  END as statut;

-- =====================================================
-- VÉRIFICATION 4 : Appartenance à la flotte "Flotte Test"
-- =====================================================

SELECT 
  'VÉRIFICATION FLOTTE' as section,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM flotte_adhesions fm
      JOIN flottes f ON f.id = fm.fleet_id
      JOIN auth.users u ON u.id = fm.user_id
      WHERE u.email = 'utilisateur_test@example.com'
        AND f.name = 'Flotte Test'
        AND fm.is_active = true
    )
    THEN '✅ Utilisateur appartient à la flotte "Flotte Test"'
    ELSE '❌ Utilisateur n''appartient pas à la flotte "Flotte Test"'
  END as statut;

-- =====================================================
-- VÉRIFICATION 5 : Rôle organizer dans flotte_adhesions
-- =====================================================

SELECT 
  'VÉRIFICATION RÔLE' as section,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM flotte_adhesions fm
      JOIN flottes f ON f.id = fm.fleet_id
      JOIN auth.users u ON u.id = fm.user_id
      WHERE u.email = 'utilisateur_test@example.com'
        AND f.name = 'Flotte Test'
        AND fm.role = 'organizer'
        AND fm.is_active = true
    )
    THEN '✅ Utilisateur a le rôle organizer dans la flotte'
    ELSE '❌ Utilisateur n''a pas le rôle organizer dans la flotte'
  END as statut;

-- Détails complets du membership
SELECT 
  'DÉTAILS MEMBERSHIP' as section,
  fm.id as membership_id,
  fm.role,
  fm.is_active,
  fm.created_at as date_ajout_flotte,
  f.name as flotte_name,
  o.name as organisation_name
FROM flotte_adhesions fm
JOIN flottes f ON f.id = fm.fleet_id
JOIN organisations o ON o.id = f.org_id
JOIN auth.users u ON u.id = fm.user_id
WHERE u.email = 'utilisateur_test@example.com'
  AND f.name = 'Flotte Test';

-- =====================================================
-- RÉSUMÉ COMPLET
-- =====================================================

SELECT 
  'RÉSUMÉ COMPLET' as section,
  CASE 
    WHEN EXISTS (SELECT 1 FROM auth.users WHERE email = 'utilisateur_test@example.com')
    THEN '✅'
    ELSE '❌'
  END as utilisateur_auth,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM profils p
      JOIN auth.users u ON u.id = p.user_id
      WHERE u.email = 'utilisateur_test@example.com'
    )
    THEN '✅'
    ELSE '❌'
  END as profil,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM flotte_adhesions fm
      JOIN flottes f ON f.id = fm.fleet_id
      JOIN organisations o ON o.id = f.org_id
      JOIN auth.users u ON u.id = fm.user_id
      WHERE u.email = 'utilisateur_test@example.com'
        AND o.name = 'Test Organisation'
        AND fm.is_active = true
    )
    THEN '✅'
    ELSE '❌'
  END as organisation,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM flotte_adhesions fm
      JOIN flottes f ON f.id = fm.fleet_id
      JOIN auth.users u ON u.id = fm.user_id
      WHERE u.email = 'utilisateur_test@example.com'
        AND f.name = 'Flotte Test'
        AND fm.is_active = true
    )
    THEN '✅'
    ELSE '❌'
  END as flotte,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM flotte_adhesions fm
      JOIN flottes f ON f.id = fm.fleet_id
      JOIN auth.users u ON u.id = fm.user_id
      WHERE u.email = 'utilisateur_test@example.com'
        AND f.name = 'Flotte Test'
        AND fm.role = 'organizer'
        AND fm.is_active = true
    )
    THEN '✅'
    ELSE '❌'
  END as role_organizer;

-- =====================================================
-- VUE D'ENSEMBLE COMPLÈTE
-- =====================================================

SELECT 
  'VUE D''ENSEMBLE COMPLÈTE' as section,
  u.id as user_id,
  u.email,
  COALESCE(p.full_name, 'Non défini') as full_name,
  p.phone,
  o.name as organisation,
  f.name as flotte,
  fm.role,
  fm.is_active,
  fm.created_at as date_ajout_flotte,
  u.created_at as date_creation_compte,
  u.email_confirmed_at
FROM auth.users u
LEFT JOIN profils p ON p.user_id = u.id
LEFT JOIN flotte_adhesions fm ON fm.user_id = u.id AND fm.is_active = true
LEFT JOIN flottes f ON f.id = fm.fleet_id
LEFT JOIN organisations o ON o.id = f.org_id
WHERE u.email = 'utilisateur_test@example.com';

-- =====================================================
-- FIN DU SCRIPT DE VÉRIFICATION
-- =====================================================
