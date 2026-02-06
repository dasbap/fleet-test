-- =====================================================
-- VÉRIFICATION COMPLÈTE DU COMPTE TEST
-- Smart Fleet Africa
-- =====================================================
-- Ce script vérifie :
-- 1. L'existence de l'organisation "Test Organisation"
-- 2. L'existence de la flotte "Flotte Test"
-- 3. Les membres et leurs rôles
-- 4. Les fonctions RPC nécessaires
-- =====================================================
-- Exécutez ce script dans Supabase SQL Editor
-- =====================================================

-- =====================================================
-- VÉRIFICATION 1 : Organisation "Test Organisation"
-- =====================================================

SELECT 
  'VÉRIFICATION ORGANISATION' as section,
  CASE 
    WHEN EXISTS (SELECT 1 FROM organisations WHERE name = 'Test Organisation') 
    THEN '✅ Organisation "Test Organisation" trouvée'
    ELSE '❌ Organisation "Test Organisation" non trouvée'
  END as statut,
  COALESCE((
    SELECT COUNT(*) 
    FROM flottes f
    JOIN organisations o ON o.id = f.org_id
    WHERE o.name = 'Test Organisation'
  ), 0) as nombre_flottes;

-- Détails de l'organisation
SELECT 
  'DÉTAILS ORGANISATION' as section,
  o.id,
  o.name,
  o.country_code,
  o.created_at,
  COUNT(DISTINCT f.id) as nombre_flottes
FROM organisations o
LEFT JOIN flottes f ON f.org_id = o.id
WHERE o.name = 'Test Organisation'
GROUP BY o.id, o.name, o.country_code, o.created_at;

-- =====================================================
-- VÉRIFICATION 2 : Flotte "Flotte Test"
-- =====================================================

SELECT 
  'VÉRIFICATION FLOTTE' as section,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM flottes f
      JOIN organisations o ON o.id = f.org_id
      WHERE f.name = 'Flotte Test' AND o.name = 'Test Organisation'
    )
    THEN '✅ Flotte "Flotte Test" trouvée'
    ELSE '❌ Flotte "Flotte Test" non trouvée'
  END as statut;

-- Détails de la flotte
SELECT 
  'DÉTAILS FLOTTE' as section,
  f.id,
  f.name,
  f.collection_policy,
  f.created_at,
  o.name as organisation_name,
  COUNT(DISTINCT fm.id) FILTER (WHERE fm.is_active = true) as membres_actifs
FROM flottes f
JOIN organisations o ON o.id = f.org_id
LEFT JOIN flotte_adhesions fm ON fm.fleet_id = f.id
WHERE f.name = 'Flotte Test'
  AND o.name = 'Test Organisation'
GROUP BY f.id, f.name, f.collection_policy, f.created_at, o.name;

-- =====================================================
-- VÉRIFICATION 3 : Fonctions RPC nécessaires
-- =====================================================

SELECT 
  'VÉRIFICATION FONCTIONS RPC' as section,
  proname as fonction,
  CASE 
    WHEN proname = 'creer_flotte_esamba' THEN '✅'
    WHEN proname = 'creer_ou_mettre_a_jour_adhesion_flotte' THEN '✅'
    WHEN proname = 'ajouter_membre_par_email' THEN '✅'
    ELSE '❓'
  END as statut,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE proname IN ('creer_flotte_esamba', 'creer_ou_mettre_a_jour_adhesion_flotte', 'ajouter_membre_par_email')
ORDER BY proname;

-- Vérifier si toutes les fonctions sont présentes
SELECT 
  'RÉSUMÉ FONCTIONS RPC' as section,
  COUNT(*) FILTER (WHERE proname = 'creer_flotte_esamba') as creer_flotte_esamba,
  COUNT(*) FILTER (WHERE proname = 'creer_ou_mettre_a_jour_adhesion_flotte') as creer_ou_mettre_a_jour_adhesion_flotte,
  COUNT(*) FILTER (WHERE proname = 'ajouter_membre_par_email') as ajouter_membre_par_email,
  CASE 
    WHEN COUNT(*) = 3 THEN '✅ Toutes les fonctions sont présentes'
    ELSE '❌ Certaines fonctions sont manquantes'
  END as statut
FROM pg_proc
WHERE proname IN ('creer_flotte_esamba', 'creer_ou_mettre_a_jour_adhesion_flotte', 'ajouter_membre_par_email');

-- =====================================================
-- VÉRIFICATION 4 : Membres de la flotte
-- =====================================================

-- Compteurs par rôle
SELECT 
  'COMPTEURS MEMBRES PAR RÔLE' as section,
  COUNT(*) FILTER (WHERE fm.is_active = true) as total_membres_actifs,
  COUNT(*) FILTER (WHERE fm.is_active = true AND fm.role = 'organizer') as organizers,
  COUNT(*) FILTER (WHERE fm.is_active = true AND fm.role = 'manager') as managers,
  COUNT(*) FILTER (WHERE fm.is_active = true AND fm.role = 'driver') as drivers,
  COUNT(*) FILTER (WHERE fm.is_active = true AND fm.role = 'mechanic') as mechanics,
  COUNT(*) FILTER (WHERE fm.is_active = false) as membres_inactifs
FROM flotte_adhesions fm
JOIN flottes f ON f.id = fm.fleet_id
WHERE f.name = 'Flotte Test';

-- Liste détaillée des membres
SELECT 
  'LISTE DÉTAILLÉE DES MEMBRES' as section,
  fm.id as membership_id,
  fm.role,
  fm.is_active,
  u.email,
  COALESCE(p.full_name, 'Non défini') as full_name,
  p.phone as telephone,
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

-- =====================================================
-- VÉRIFICATION 5 : Vérification spécifique test@example.com
-- =====================================================

SELECT 
  'VÉRIFICATION UTILISATEUR TEST' as section,
  CASE 
    WHEN EXISTS (SELECT 1 FROM auth.users WHERE email = 'test@example.com')
    THEN '✅ Utilisateur test@example.com existe'
    ELSE '❌ Utilisateur test@example.com non trouvé'
  END as statut_utilisateur,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM flotte_adhesions fm
      JOIN flottes f ON f.id = fm.fleet_id
      JOIN auth.users u ON u.id = fm.user_id
      WHERE f.name = 'Flotte Test'
        AND u.email = 'test@example.com'
        AND fm.is_active = true
    )
    THEN '✅ test@example.com est membre de la flotte'
    ELSE '❌ test@example.com n''est pas membre de la flotte'
  END as statut_membre;

-- Détails de l'utilisateur test@example.com dans la flotte
SELECT 
  'DÉTAILS UTILISATEUR TEST' as section,
  u.id as user_id,
  u.email,
  COALESCE(p.full_name, 'Non défini') as full_name,
  fm.role,
  fm.is_active,
  f.name as fleet_name,
  fm.created_at as date_ajout
FROM auth.users u
LEFT JOIN profils p ON p.user_id = u.id
LEFT JOIN flotte_adhesions fm ON fm.user_id = u.id
LEFT JOIN flottes f ON f.id = fm.fleet_id
WHERE u.email = 'test@example.com'
  AND f.name = 'Flotte Test';

-- =====================================================
-- VÉRIFICATION 6 : Résumé complet
-- =====================================================

SELECT 
  'RÉSUMÉ COMPLET' as section,
  CASE 
    WHEN EXISTS (SELECT 1 FROM organisations WHERE name = 'Test Organisation')
    THEN '✅'
    ELSE '❌'
  END as organisation,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM flottes f
      JOIN organisations o ON o.id = f.org_id
      WHERE f.name = 'Flotte Test' AND o.name = 'Test Organisation'
    )
    THEN '✅'
    ELSE '❌'
  END as flotte,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM flotte_adhesions fm
      JOIN flottes f ON f.id = fm.fleet_id
      WHERE f.name = 'Flotte Test' AND fm.is_active = true
    )
    THEN '✅'
    ELSE '❌'
  END as membres,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM flotte_adhesions fm
      JOIN flottes f ON f.id = fm.fleet_id
      JOIN auth.users u ON u.id = fm.user_id
      WHERE f.name = 'Flotte Test'
        AND u.email = 'test@example.com'
        AND fm.is_active = true
    )
    THEN '✅'
    ELSE '❌'
  END as utilisateur_test,
  (
    SELECT COUNT(*) FROM pg_proc
    WHERE proname IN ('creer_flotte_esamba', 'creer_ou_mettre_a_jour_adhesion_flotte', 'ajouter_membre_par_email')
  ) = 3 as fonctions_rpc;

-- =====================================================
-- FIN DU SCRIPT DE VÉRIFICATION
-- =====================================================
