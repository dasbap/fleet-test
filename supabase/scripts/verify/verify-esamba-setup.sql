-- =====================================================
-- VÉRIFICATION COMPLÈTE DE LA CONFIGURATION ESAMBA
-- Smart Fleet Africa - E-Samba
-- =====================================================
-- Ce script vérifie :
-- 1. L'existence de l'Organisation ESAMBA
-- 2. L'existence de la Flotte ESAMBA
-- 3. Les véhicules de la flotte
-- 4. Les membres et leurs rôles
-- 5. Les fonctions RPC disponibles
-- =====================================================
-- Exécutez ce script dans Supabase SQL Editor
-- =====================================================

-- =====================================================
-- VÉRIFICATION 1 : Organisation ESAMBA
-- =====================================================

SELECT 
  'VÉRIFICATION ORGANISATION' as section,
  CASE 
    WHEN EXISTS (SELECT 1 FROM organisations WHERE name = 'Organisation ESAMBA') 
    THEN '✅ Organisation ESAMBA trouvée'
    ELSE '❌ Organisation ESAMBA non trouvée'
  END as statut,
  COALESCE((
    SELECT COUNT(*) 
    FROM flottes f
    JOIN organisations o ON o.id = f.org_id
    WHERE o.name = 'Organisation ESAMBA'
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
WHERE o.name = 'Organisation ESAMBA'
GROUP BY o.id, o.name, o.country_code, o.created_at;

-- =====================================================
-- VÉRIFICATION 2 : Flotte ESAMBA
-- =====================================================

SELECT 
  'VÉRIFICATION FLOTTE' as section,
  CASE 
    WHEN EXISTS (SELECT 1 FROM flottes WHERE name = 'Flotte ESAMBA') 
    THEN '✅ Flotte ESAMBA trouvée'
    ELSE '❌ Flotte ESAMBA non trouvée'
  END as statut,
  COALESCE((
    SELECT COUNT(DISTINCT v.id)
    FROM flottes f
    LEFT JOIN vehicules v ON v.fleet_id = f.id
    WHERE f.name = 'Flotte ESAMBA'
  ), 0) as nombre_vehicules,
  COALESCE((
    SELECT COUNT(DISTINCT fm.user_id)
    FROM flottes f
    LEFT JOIN flotte_adhesions fm ON fm.fleet_id = f.id AND fm.is_active = true
    WHERE f.name = 'Flotte ESAMBA'
  ), 0) as nombre_membres;

-- Détails de la flotte
SELECT 
  'DÉTAILS FLOTTE' as section,
  f.id,
  f.name,
  f.collection_policy,
  f.created_at,
  o.name as organisation
FROM flottes f
JOIN organisations o ON o.id = f.org_id
WHERE f.name = 'Flotte ESAMBA';

-- =====================================================
-- VÉRIFICATION 3 : Véhicules
-- =====================================================

SELECT 
  'VÉRIFICATION VÉHICULES' as section,
  COUNT(*) as total_vehicules,
  COUNT(*) FILTER (WHERE v.status = 'ok') as vehicules_ok,
  COUNT(*) FILTER (WHERE v.status = 'blocked') as vehicules_bloques
FROM vehicules v
JOIN flottes f ON f.id = v.fleet_id
WHERE f.name = 'Flotte ESAMBA';

-- Liste des véhicules
SELECT 
  'LISTE VÉHICULES' as section,
  v.registration,
  v.brand,
  v.model,
  v.year,
  v.current_km,
  CASE 
    WHEN v.status = 'ok' THEN '✅ OK'
    WHEN v.status = 'blocked' THEN '❌ Bloqué'
    ELSE v.status
  END as statut,
  TO_CHAR(v.created_at, 'DD/MM/YYYY') as date_creation
FROM vehicules v
JOIN flottes f ON f.id = v.fleet_id
WHERE f.name = 'Flotte ESAMBA'
ORDER BY v.registration;

-- =====================================================
-- VÉRIFICATION 4 : Membres et rôles
-- =====================================================

SELECT 
  'VÉRIFICATION MEMBRES' as section,
  COUNT(DISTINCT fm.user_id) as total_membres,
  COUNT(*) FILTER (WHERE fm.role = 'organizer' AND fm.is_active = true) as organisateurs_actifs,
  COUNT(*) FILTER (WHERE fm.role = 'manager' AND fm.is_active = true) as managers_actifs,
  COUNT(*) FILTER (WHERE fm.role = 'driver' AND fm.is_active = true) as chauffeurs_actifs,
  COUNT(*) FILTER (WHERE fm.role = 'mechanic' AND fm.is_active = true) as mecaniciens_actifs,
  COUNT(*) FILTER (WHERE fm.is_active = false) as membres_inactifs
FROM flotte_adhesions fm
JOIN flottes f ON f.id = fm.fleet_id
WHERE f.name = 'Flotte ESAMBA';

-- Liste détaillée des membres avec leurs rôles
SELECT 
  'LISTE MEMBRES' as section,
  p.full_name as nom_complet,
  COALESCE(p.phone, 'Non renseigné') as telephone,
  u.email,
  fm.role as role_code,
  CASE 
    WHEN fm.role = 'organizer' THEN 'Organisateur'
    WHEN fm.role = 'manager' THEN 'Gestionnaire'
    WHEN fm.role = 'driver' THEN 'Chauffeur'
    WHEN fm.role = 'mechanic' THEN 'Mécanicien'
    ELSE fm.role
  END as role_fr,
  CASE 
    WHEN fm.is_active THEN '✅ Actif'
    ELSE '❌ Inactif'
  END as statut,
  TO_CHAR(fm.created_at, 'DD/MM/YYYY HH24:MI') as date_ajout
FROM flotte_adhesions fm
JOIN flottes f ON f.id = fm.fleet_id
LEFT JOIN profils p ON p.user_id = fm.user_id
LEFT JOIN auth.users u ON u.id = fm.user_id
WHERE f.name = 'Flotte ESAMBA'
ORDER BY 
  CASE fm.role
    WHEN 'organizer' THEN 1
    WHEN 'manager' THEN 2
    WHEN 'mechanic' THEN 3
    WHEN 'driver' THEN 4
  END,
  fm.created_at DESC;

-- Membres groupés par utilisateur (pour voir tous les rôles d'un même utilisateur)
SELECT 
  'MEMBRES GROUPÉS' as section,
  p.full_name as nom_complet,
  u.email,
  STRING_AGG(
    CASE 
      WHEN fm.role = 'organizer' THEN 'Organisateur'
      WHEN fm.role = 'manager' THEN 'Gestionnaire'
      WHEN fm.role = 'driver' THEN 'Chauffeur'
      WHEN fm.role = 'mechanic' THEN 'Mécanicien'
      ELSE fm.role
    END || 
    CASE WHEN fm.is_active THEN ' (Actif)' ELSE ' (Inactif)' END,
    ', '
    ORDER BY 
      CASE fm.role
        WHEN 'organizer' THEN 1
        WHEN 'manager' THEN 2
        WHEN 'mechanic' THEN 3
        WHEN 'driver' THEN 4
      END
  ) as roles
FROM flotte_adhesions fm
JOIN flottes f ON f.id = fm.fleet_id
LEFT JOIN profils p ON p.user_id = fm.user_id
LEFT JOIN auth.users u ON u.id = fm.user_id
WHERE f.name = 'Flotte ESAMBA'
GROUP BY fm.user_id, p.full_name, u.email
ORDER BY p.full_name;

-- =====================================================
-- VÉRIFICATION 5 : Recherche de valeurs ESAMBA dans toutes les tables
-- =====================================================
-- Ce script recherche dans toutes les colonnes text/varchar
-- pour trouver où se trouvent les valeurs ESAMBA
-- =====================================================

DO $$
DECLARE
  r record;
  q text;
  hit int;
  search_values text[] := ARRAY['Organisation ESAMBA', 'Flotte ESAMBA', 'ESAMBA-001', 'ESAMBA-002', 'ESAMBA-003', 'ESAMBA-2024'];
  search_val text;
  total_found int := 0;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RECHERCHE DES VALEURS ESAMBA';
  RAISE NOTICE '========================================';
  
  FOREACH search_val IN ARRAY search_values
  LOOP
    RAISE NOTICE '--- Recherche de "%" ---', search_val;
    
    FOR r IN
      SELECT table_schema, table_name, column_name
      FROM information_schema.columns
      WHERE data_type IN ('text', 'character varying')
        AND table_schema NOT IN ('pg_catalog', 'information_schema')
        AND table_schema = 'public'
      ORDER BY table_name, column_name
    LOOP
      BEGIN
        q := format('SELECT COUNT(*) FROM %I.%I WHERE %I = %L',
                    r.table_schema, r.table_name, r.column_name, search_val);
        EXECUTE q INTO hit;
        
        IF hit > 0 THEN
          total_found := total_found + 1;
          RAISE NOTICE '  ✅ Trouvé % occurrence(s) dans %.% (colonne %)', 
                       hit, r.table_schema, r.table_name, r.column_name;
        END IF;
      EXCEPTION
        WHEN OTHERS THEN
          -- Ignorer les erreurs (colonnes qui ne peuvent pas être comparées, etc.)
          NULL;
      END;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total de colonnes avec valeurs ESAMBA : %', total_found;
  RAISE NOTICE '========================================';
END $$;

-- =====================================================
-- VÉRIFICATION 6 : Fonctions RPC
-- =====================================================

SELECT 
  'VÉRIFICATION FONCTIONS RPC' as section,
  proname as fonction,
  CASE 
    WHEN proname = 'creer_flotte_esamba' THEN '✅ Disponible'
    WHEN proname = 'creer_vehicule_esamba' THEN '✅ Disponible'
    WHEN proname = 'creer_invitation_esamba' THEN '✅ Disponible'
    WHEN proname = 'creer_ou_mettre_a_jour_adhesion_flotte' THEN '✅ Disponible'
    WHEN proname = 'ajouter_membre_par_email' THEN '✅ Disponible'
    ELSE '❓ Autre fonction'
  END as statut
FROM pg_proc
WHERE proname IN (
  'creer_flotte_esamba',
  'creer_vehicule_esamba',
  'creer_invitation_esamba',
  'creer_ou_mettre_a_jour_adhesion_flotte',
  'ajouter_membre_par_email'
)
ORDER BY proname;

-- =====================================================
-- RÉSUMÉ FINAL
-- =====================================================

DO $$
DECLARE
  v_org_exists boolean;
  v_fleet_exists boolean;
  v_vehicles_count integer;
  v_members_count integer;
  v_organizers_count integer;
  v_managers_count integer;
  v_drivers_count integer;
  v_mechanics_count integer;
BEGIN
  -- Vérifier l'organisation
  SELECT EXISTS(SELECT 1 FROM organisations WHERE name = 'Organisation ESAMBA') INTO v_org_exists;
  
  -- Vérifier la flotte
  SELECT EXISTS(SELECT 1 FROM flottes WHERE name = 'Flotte ESAMBA') INTO v_fleet_exists;
  
  -- Compter les véhicules
  SELECT COUNT(*) INTO v_vehicles_count
  FROM vehicules v
  JOIN flottes f ON f.id = v.fleet_id
  WHERE f.name = 'Flotte ESAMBA';
  
  -- Compter les membres
  SELECT COUNT(DISTINCT fm.user_id) INTO v_members_count
  FROM flotte_adhesions fm
  JOIN flottes f ON f.id = fm.fleet_id
  WHERE f.name = 'Flotte ESAMBA' AND fm.is_active = true;
  
  -- Compter par rôle
  SELECT COUNT(*) FILTER (WHERE role = 'organizer' AND is_active = true) INTO v_organizers_count
  FROM flotte_adhesions fm
  JOIN flottes f ON f.id = fm.fleet_id
  WHERE f.name = 'Flotte ESAMBA';
  
  SELECT COUNT(*) FILTER (WHERE role = 'manager' AND is_active = true) INTO v_managers_count
  FROM flotte_adhesions fm
  JOIN flottes f ON f.id = fm.fleet_id
  WHERE f.name = 'Flotte ESAMBA';
  
  SELECT COUNT(*) FILTER (WHERE role = 'driver' AND is_active = true) INTO v_drivers_count
  FROM flotte_adhesions fm
  JOIN flottes f ON f.id = fm.fleet_id
  WHERE f.name = 'Flotte ESAMBA';
  
  SELECT COUNT(*) FILTER (WHERE role = 'mechanic' AND is_active = true) INTO v_mechanics_count
  FROM flotte_adhesions fm
  JOIN flottes f ON f.id = fm.fleet_id
  WHERE f.name = 'Flotte ESAMBA';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RÉSUMÉ DE LA CONFIGURATION ESAMBA';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Organisation ESAMBA : %', CASE WHEN v_org_exists THEN '✅ Trouvée' ELSE '❌ Non trouvée' END;
  RAISE NOTICE 'Flotte ESAMBA : %', CASE WHEN v_fleet_exists THEN '✅ Trouvée' ELSE '❌ Non trouvée' END;
  RAISE NOTICE 'Véhicules : %', v_vehicles_count;
  RAISE NOTICE 'Membres actifs : %', v_members_count;
  RAISE NOTICE '  - Organisateurs : %', v_organizers_count;
  RAISE NOTICE '  - Gestionnaires : %', v_managers_count;
  RAISE NOTICE '  - Chauffeurs : %', v_drivers_count;
  RAISE NOTICE '  - Mécaniciens : %', v_mechanics_count;
  RAISE NOTICE '========================================';
  
  IF NOT v_org_exists THEN
    RAISE NOTICE '⚠️  ACTION REQUISE : Créer l''Organisation ESAMBA';
  END IF;
  
  IF NOT v_fleet_exists THEN
    RAISE NOTICE '⚠️  ACTION REQUISE : Créer la Flotte ESAMBA';
  END IF;
  
  IF v_vehicles_count = 0 THEN
    RAISE NOTICE '⚠️  ACTION REQUISE : Ajouter des véhicules à la flotte';
  END IF;
  
  IF v_members_count = 0 THEN
    RAISE NOTICE '⚠️  ACTION REQUISE : Ajouter des membres à la flotte';
  END IF;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Pour créer les données manquantes :';
  RAISE NOTICE '  1. Exécutez le script setup-esamba-complete.sql';
  RAISE NOTICE '  2. Ou utilisez le bouton dans /dashboard/settings';
  RAISE NOTICE '========================================';
END $$;
