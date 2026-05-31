-- =====================================================
-- VÉRIFICATION COMPLÈTE DES DONNÉES ESAMBA
-- Smart Fleet Africa
-- =====================================================
-- Ce script vérifie que toutes les données ESAMBA sont créées
-- et affiche un rapport détaillé pour chaque élément
-- =====================================================
-- Exécutez ce script dans Supabase SQL Editor
-- =====================================================

-- =====================================================
-- VÉRIFICATION 1 : Organisation ESAMBA
-- =====================================================

-- =====================================================
-- VÉRIFICATION 1 : Organisation ESAMBA (cohérence base)
-- =====================================================

SELECT 
  '1. ORGANISATION ESAMBA' AS verification,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ CRÉÉE'
    ELSE '❌ ABSENTE'
  END AS statut,
  COUNT(*) AS nombre,
  STRING_AGG(id::text, ', ') AS ids,
  STRING_AGG(name, ', ') AS noms,
  STRING_AGG(country_code, ', ') AS codes_pays,
  MAX(created_at) AS derniere_creation
FROM organisations
WHERE name = 'Organisation ESAMBA';

-- =====================================================
-- VÉRIFICATION 2 : Flotte ESAMBA (PRIORITAIRE, cohérence base)
-- =====================================================

SELECT 
  '2. FLOTTE ESAMBA ⭐' AS verification,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ CRÉÉE'
    ELSE '❌ ABSENTE'
  END AS statut,
  COUNT(*) AS nombre,
  STRING_AGG(f.id::text, ', ') AS ids,
  STRING_AGG(f.name, ', ') AS noms,
  STRING_AGG(f.collection_policy, ', ') AS politiques,
  STRING_AGG(o.name, ', ') AS organisations,
  MAX(f.created_at) AS derniere_creation
FROM flottes f
LEFT JOIN organisations o ON o.id = f.org_id
WHERE f.name = 'Flotte ESAMBA';

-- Détails complets de la Flotte ESAMBA
SELECT 
  'DÉTAILS FLOTTE ESAMBA' AS section,
  f.id AS fleet_id,
  f.name AS nom_flotte,
  f.collection_policy AS politique_collecte,
  o.id AS org_id,
  o.name AS nom_organisation,
  o.country_code AS code_pays,
  f.created_at AS date_creation,
  CASE 
    WHEN f.id IS NOT NULL THEN '✅ FLOTTE TROUVÉE'
    ELSE '❌ FLOTTE NON TROUVÉE'
  END AS statut_detaille
FROM flottes f
LEFT JOIN organisations o ON o.id = f.org_id
WHERE f.name = 'Flotte ESAMBA'
LIMIT 1;

-- =====================================================
-- VÉRIFICATION 3 : Véhicule ESAMBA-001 (cohérence base)
-- =====================================================

SELECT 
  '3. VÉHICULE ESAMBA-001' AS verification,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ CRÉÉ'
    ELSE '❌ ABSENT'
  END AS statut,
  COUNT(*) AS nombre,
  STRING_AGG(v.id::text, ', ') AS ids,
  STRING_AGG(v.registration, ', ') AS immatriculations,
  STRING_AGG(v.brand || ' ' || v.model, ', ') AS vehicules,
  STRING_AGG(f.name, ', ') AS flottes,
  MAX(v.created_at) AS derniere_creation
FROM vehicules v
JOIN flottes f ON f.id = v.fleet_id
WHERE f.name = 'Flotte ESAMBA'
  AND v.registration = 'ESAMBA-001';

-- Détails complets du Véhicule
SELECT 
  'DÉTAILS VÉHICULE ESAMBA-001' AS section,
  v.id AS vehicle_id,
  v.registration AS immatriculation,
  v.brand AS marque,
  v.model AS modele,
  v.year AS annee,
  v.current_km AS kilometrage,
  v.status AS statut,
  f.id AS fleet_id,
  f.name AS nom_flotte,
  v.created_at AS date_creation,
  CASE 
    WHEN v.id IS NOT NULL THEN '✅ VÉHICULE TROUVÉ'
    ELSE '❌ VÉHICULE NON TROUVÉ'
  END AS statut_detaille
FROM vehicules v
JOIN flottes f ON f.id = v.fleet_id
WHERE f.name = 'Flotte ESAMBA'
  AND v.registration = 'ESAMBA-001'
LIMIT 1;

-- =====================================================
-- VÉRIFICATION 4 : Invitation ESAMBA-2024 (cohérence base)
-- =====================================================

SELECT 
  '4. INVITATION ESAMBA-2024' AS verification,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ CRÉÉE'
    ELSE '❌ ABSENTE'
  END AS statut,
  COUNT(*) AS nombre,
  STRING_AGG(fi.id::text, ', ') AS ids,
  STRING_AGG(fi.code, ', ') AS codes,
  STRING_AGG(fi.current_uses::text, ', ') AS utilisations,
  STRING_AGG(f.name, ', ') AS flottes,
  MAX(fi.created_at) AS derniere_creation
FROM flotte_invitations fi
JOIN flottes f ON f.id = fi.fleet_id
WHERE f.name = 'Flotte ESAMBA'
  AND fi.code = 'ESAMBA-2024';

-- Détails complets de l'Invitation
SELECT 
  'DÉTAILS INVITATION ESAMBA-2024' AS section,
  fi.id AS invitation_id,
  fi.code AS code_invitation,
  fi.current_uses AS utilisations_actuelles,
  fi.max_uses AS utilisations_max,
  fi.expires_at AS date_expiration,
  f.id AS fleet_id,
  f.name AS nom_flotte,
  fi.created_at AS date_creation,
  CASE 
    WHEN fi.id IS NOT NULL THEN '✅ INVITATION TROUVÉE'
    ELSE '❌ INVITATION NON TROUVÉE'
  END AS statut_detaille
FROM flotte_invitations fi
JOIN flottes f ON f.id = fi.fleet_id
WHERE f.name = 'Flotte ESAMBA'
  AND fi.code = 'ESAMBA-2024'
LIMIT 1;

-- =====================================================
-- VÉRIFICATION 5 : Membership Organizer (cohérence base, si utilisateur connecté)
-- =====================================================

SELECT 
  '5. MEMBERSHIP ORGANIZER' AS verification,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ CRÉÉ'
    ELSE '❌ ABSENT (créer via l''app)'
  END AS statut,
  COUNT(*) AS nombre,
  STRING_AGG(fm.id::text, ', ') AS ids,
  STRING_AGG(fm.role::text, ', ') AS roles,
  STRING_AGG(f.name, ', ') AS flottes,
  MAX(fm.created_at) AS derniere_creation
FROM flotte_adhesions fm
JOIN flottes f ON f.id = fm.fleet_id
WHERE f.name = 'Flotte ESAMBA'
  AND fm.role = 'organizer'
  AND fm.is_active = true;

-- =====================================================
-- VÉRIFICATION 6 : Affectation conducteur ↔ ESAMBA-001
-- =====================================================

SELECT
  '6. AFFECTATION CONDUCTEUR ↔ VÉHICULE' AS verification,
  CASE
    WHEN COUNT(*) > 0 THEN '✅ CRÉÉE'
    ELSE '❌ ABSENTE (exécuter setup-esamba-affectation-conducteur.sql)'
  END AS statut,
  COUNT(*) AS nombre_affectations_actives,
  STRING_AGG(av.id::text, ', ') AS assignment_ids,
  STRING_AGG(v.registration, ', ') AS immatriculations,
  STRING_AGG(av.driver_user_id::text, ', ') AS driver_user_ids
FROM public.affectations_vehicules av
INNER JOIN public.flottes f ON f.id = av.fleet_id
INNER JOIN public.vehicules v ON v.id = av.vehicle_id
WHERE f.name = 'Flotte ESAMBA'
  AND v.registration = 'ESAMBA-001'
  AND av.is_active = true;

SELECT
  'DÉTAILS AFFECTATION ESAMBA-001' AS section,
  av.id AS assignment_id,
  av.fleet_id,
  av.vehicle_id,
  v.registration,
  av.driver_user_id,
  p.full_name AS conducteur,
  av.starts_at,
  av.is_active
FROM public.affectations_vehicules av
INNER JOIN public.flottes f ON f.id = av.fleet_id
INNER JOIN public.vehicules v ON v.id = av.vehicle_id
LEFT JOIN public.profils p ON p.user_id = av.driver_user_id
WHERE f.name = 'Flotte ESAMBA'
  AND v.registration = 'ESAMBA-001'
  AND av.is_active = true
LIMIT 5;

-- =====================================================
-- RÉSUMÉ GLOBAL (cohérence base)
-- =====================================================

SELECT 
  'RÉSUMÉ GLOBAL' AS section,
  (SELECT COUNT(*) FROM organisations WHERE name = 'Organisation ESAMBA') AS organisation_count,
  (SELECT COUNT(*) FROM flottes WHERE name = 'Flotte ESAMBA') AS flotte_count,
  (SELECT COUNT(*) FROM vehicules v
   JOIN flottes f ON f.id = v.fleet_id
   WHERE f.name = 'Flotte ESAMBA' 
     AND v.registration = 'ESAMBA-001') AS vehicule_count,
  (SELECT COUNT(*) FROM flotte_invitations fi
   JOIN flottes f ON f.id = fi.fleet_id
   WHERE f.name = 'Flotte ESAMBA' 
     AND fi.code = 'ESAMBA-2024') AS invitation_count,
  (SELECT COUNT(*) FROM flotte_adhesions fm
   JOIN flottes f ON f.id = fm.fleet_id
   WHERE f.name = 'Flotte ESAMBA' 
     AND fm.role = 'organizer' 
     AND fm.is_active = true) AS membership_count,
  CASE 
    WHEN (SELECT COUNT(*) FROM organisations WHERE name = 'Organisation ESAMBA') > 0
     AND (SELECT COUNT(*) FROM flottes WHERE name = 'Flotte ESAMBA') > 0
     AND (SELECT COUNT(*) FROM vehicules v
          JOIN flottes f ON f.id = v.fleet_id
          WHERE f.name = 'Flotte ESAMBA' 
            AND v.registration = 'ESAMBA-001') > 0
     AND (SELECT COUNT(*) FROM flotte_invitations fi
          JOIN flottes f ON f.id = fi.fleet_id
          WHERE f.name = 'Flotte ESAMBA' 
            AND fi.code = 'ESAMBA-2024') > 0
    THEN '✅ DONNÉES PRINCIPALES CRÉÉES'
    ELSE '❌ DONNÉES MANQUANTES'
  END AS statut_global;

-- =====================================================
-- VÉRIFICATION SPÉCIALE : FLOTTE ESAMBA (DÉTAILS COMPLETS, cohérence base)
-- =====================================================

SELECT 
  '⭐ VÉRIFICATION DÉTAILLÉE FLOTTE ESAMBA ⭐' AS titre,
  f.id AS fleet_id,
  f.name AS nom_flotte,
  f.collection_policy AS politique,
  f.created_at AS date_creation,
  o.id AS org_id,
  o.name AS organisation,
  o.country_code AS pays,
  (SELECT COUNT(*) FROM vehicules v WHERE v.fleet_id = f.id) AS nombre_vehicules,
  (SELECT COUNT(*) FROM flotte_invitations fi WHERE fi.fleet_id = f.id) AS nombre_invitations,
  (SELECT COUNT(*) FROM flotte_adhesions fm WHERE fm.fleet_id = f.id AND fm.is_active = true) AS nombre_membres,
  CASE 
    WHEN f.id IS NOT NULL THEN '✅ FLOTTE EXISTE'
    ELSE '❌ FLOTTE N''EXISTE PAS'
  END AS statut
FROM flottes f
LEFT JOIN organisations o ON o.id = f.org_id
WHERE f.name = 'Flotte ESAMBA';

-- =====================================================
-- RELATIONS COMPLÈTES : Flotte ESAMBA et ses dépendances (cohérence base)
-- =====================================================

SELECT 
  'RELATIONS FLOTTE ESAMBA' AS section,
  'Organisation' AS type_relation,
  o.id::text AS id_relation,
  o.name AS nom_relation,
  '✅' AS statut
FROM flottes f
JOIN organisations o ON o.id = f.org_id
WHERE f.name = 'Flotte ESAMBA'
UNION ALL
SELECT 
  'RELATIONS FLOTTE ESAMBA',
  'Véhicules',
  v.id::text,
  v.registration,
  '✅'
FROM flottes f
JOIN vehicules v ON v.fleet_id = f.id
WHERE f.name = 'Flotte ESAMBA'
UNION ALL
SELECT 
  'RELATIONS FLOTTE ESAMBA',
  'Invitations',
  fi.id::text,
  fi.code,
  '✅'
FROM flottes f
JOIN flotte_invitations fi ON fi.fleet_id = f.id
WHERE f.name = 'Flotte ESAMBA'
UNION ALL
SELECT 
  'RELATIONS FLOTTE ESAMBA',
  'Membres',
  fm.id::text,
  fm.role::text,
  CASE WHEN fm.is_active THEN '✅' ELSE '⚠️' END
FROM flottes f
JOIN flotte_adhesions fm ON fm.fleet_id = f.id
WHERE f.name = 'Flotte ESAMBA'
ORDER BY type_relation, nom_relation;

-- =====================================================
-- TEST FINAL : Vérification avec fonction RPC (si disponible et cohérent base)
-- =====================================================

-- Note: Cette fonction nécessite un utilisateur authentifié
-- Si vous êtes connecté, décommentez cette section :
/*
SELECT 
  'TEST AVEC FONCTION RPC' AS test,
  organisation,
  flotte,
  membership_organizer,
  vehicule_esamba_001,
  invitation_esamba_2024,
  CASE 
    WHEN organisation = true 
     AND flotte = true 
     AND vehicule_esamba_001 = true 
     AND invitation_esamba_2024 = true 
    THEN '✅ TOUT EST CRÉÉ'
    ELSE '⚠️  ÉLÉMENTS MANQUANTS'
  END AS resultat
FROM check_esamba_2024();
*/
