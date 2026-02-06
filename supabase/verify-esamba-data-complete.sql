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

SELECT 
  '1. ORGANISATION ESAMBA' as verification,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ CRÉÉE'
    ELSE '❌ ABSENTE'
  END as statut,
  COUNT(*) as nombre,
  STRING_AGG(id::text, ', ') as ids,
  STRING_AGG(name, ', ') as noms,
  STRING_AGG(country_code, ', ') as codes_pays,
  MAX(created_at) as derniere_creation
FROM orgs
WHERE name = 'Organisation ESAMBA';

-- =====================================================
-- VÉRIFICATION 2 : Flotte ESAMBA (PRIORITAIRE)
-- =====================================================

SELECT 
  '2. FLOTTE ESAMBA ⭐' as verification,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ CRÉÉE'
    ELSE '❌ ABSENTE'
  END as statut,
  COUNT(*) as nombre,
  STRING_AGG(f.id::text, ', ') as ids,
  STRING_AGG(f.name, ', ') as noms,
  STRING_AGG(f.collection_policy, ', ') as politiques,
  STRING_AGG(o.name, ', ') as organisations,
  MAX(f.created_at) as derniere_creation
FROM fleets f
LEFT JOIN orgs o ON o.id = f.org_id
WHERE f.name = 'Flotte ESAMBA';

-- Détails complets de la Flotte ESAMBA
SELECT 
  'DÉTAILS FLOTTE ESAMBA' as section,
  f.id as fleet_id,
  f.name as nom_flotte,
  f.collection_policy as politique_collecte,
  o.id as org_id,
  o.name as nom_organisation,
  o.country_code as code_pays,
  f.created_at as date_creation,
  CASE 
    WHEN f.id IS NOT NULL THEN '✅ FLOTTE TROUVÉE'
    ELSE '❌ FLOTTE NON TROUVÉE'
  END as statut_detaille
FROM fleets f
LEFT JOIN orgs o ON o.id = f.org_id
WHERE f.name = 'Flotte ESAMBA'
LIMIT 1;

-- =====================================================
-- VÉRIFICATION 3 : Véhicule ESAMBA-001
-- =====================================================

SELECT 
  '3. VÉHICULE ESAMBA-001' as verification,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ CRÉÉ'
    ELSE '❌ ABSENT'
  END as statut,
  COUNT(*) as nombre,
  STRING_AGG(v.id::text, ', ') as ids,
  STRING_AGG(v.registration, ', ') as immatriculations,
  STRING_AGG(v.brand || ' ' || v.model, ', ') as vehicules,
  STRING_AGG(f.name, ', ') as flottes,
  MAX(v.created_at) as derniere_creation
FROM vehicles v
JOIN fleets f ON f.id = v.fleet_id
WHERE f.name = 'Flotte ESAMBA'
  AND v.registration = 'ESAMBA-001';

-- Détails complets du Véhicule
SELECT 
  'DÉTAILS VÉHICULE ESAMBA-001' as section,
  v.id as vehicle_id,
  v.registration as immatriculation,
  v.brand as marque,
  v.model as modele,
  v.year as annee,
  v.current_km as kilometrage,
  v.status as statut,
  f.id as fleet_id,
  f.name as nom_flotte,
  v.created_at as date_creation,
  CASE 
    WHEN v.id IS NOT NULL THEN '✅ VÉHICULE TROUVÉ'
    ELSE '❌ VÉHICULE NON TROUVÉ'
  END as statut_detaille
FROM vehicles v
JOIN fleets f ON f.id = v.fleet_id
WHERE f.name = 'Flotte ESAMBA'
  AND v.registration = 'ESAMBA-001'
LIMIT 1;

-- =====================================================
-- VÉRIFICATION 4 : Invitation ESAMBA-2024
-- =====================================================

SELECT 
  '4. INVITATION ESAMBA-2024' as verification,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ CRÉÉE'
    ELSE '❌ ABSENTE'
  END as statut,
  COUNT(*) as nombre,
  STRING_AGG(fi.id::text, ', ') as ids,
  STRING_AGG(fi.code, ', ') as codes,
  STRING_AGG(fi.current_uses::text, ', ') as utilisations,
  STRING_AGG(f.name, ', ') as flottes,
  MAX(fi.created_at) as derniere_creation
FROM fleet_invitations fi
JOIN fleets f ON f.id = fi.fleet_id
WHERE f.name = 'Flotte ESAMBA'
  AND fi.code = 'ESAMBA-2024';

-- Détails complets de l'Invitation
SELECT 
  'DÉTAILS INVITATION ESAMBA-2024' as section,
  fi.id as invitation_id,
  fi.code as code_invitation,
  fi.current_uses as utilisations_actuelles,
  fi.max_uses as utilisations_max,
  fi.expires_at as date_expiration,
  f.id as fleet_id,
  f.name as nom_flotte,
  fi.created_at as date_creation,
  CASE 
    WHEN fi.id IS NOT NULL THEN '✅ INVITATION TROUVÉE'
    ELSE '❌ INVITATION NON TROUVÉE'
  END as statut_detaille
FROM fleet_invitations fi
JOIN fleets f ON f.id = fi.fleet_id
WHERE f.name = 'Flotte ESAMBA'
  AND fi.code = 'ESAMBA-2024'
LIMIT 1;

-- =====================================================
-- VÉRIFICATION 5 : Membership Organizer (si utilisateur connecté)
-- =====================================================

SELECT 
  '5. MEMBERSHIP ORGANIZER' as verification,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ CRÉÉ'
    ELSE '❌ ABSENT (créer via l''app)'
  END as statut,
  COUNT(*) as nombre,
  STRING_AGG(fm.id::text, ', ') as ids,
  STRING_AGG(fm.role::text, ', ') as roles,
  STRING_AGG(f.name, ', ') as flottes,
  MAX(fm.created_at) as derniere_creation
FROM fleet_memberships fm
JOIN fleets f ON f.id = fm.fleet_id
WHERE f.name = 'Flotte ESAMBA'
  AND fm.role = 'organizer'
  AND fm.is_active = true;

-- =====================================================
-- RÉSUMÉ GLOBAL
-- =====================================================

SELECT 
  'RÉSUMÉ GLOBAL' as section,
  (SELECT COUNT(*) FROM orgs WHERE name = 'Organisation ESAMBA') as organisation_count,
  (SELECT COUNT(*) FROM fleets WHERE name = 'Flotte ESAMBA') as flotte_count,
  (SELECT COUNT(*) FROM vehicles v
   JOIN fleets f ON f.id = v.fleet_id
   WHERE f.name = 'Flotte ESAMBA' 
     AND v.registration = 'ESAMBA-001') as vehicule_count,
  (SELECT COUNT(*) FROM fleet_invitations fi
   JOIN fleets f ON f.id = fi.fleet_id
   WHERE f.name = 'Flotte ESAMBA' 
     AND fi.code = 'ESAMBA-2024') as invitation_count,
  (SELECT COUNT(*) FROM fleet_memberships fm
   JOIN fleets f ON f.id = fm.fleet_id
   WHERE f.name = 'Flotte ESAMBA' 
     AND fm.role = 'organizer' 
     AND fm.is_active = true) as membership_count,
  CASE 
    WHEN (SELECT COUNT(*) FROM orgs WHERE name = 'Organisation ESAMBA') > 0
     AND (SELECT COUNT(*) FROM fleets WHERE name = 'Flotte ESAMBA') > 0
     AND (SELECT COUNT(*) FROM vehicles v
          JOIN fleets f ON f.id = v.fleet_id
          WHERE f.name = 'Flotte ESAMBA' 
            AND v.registration = 'ESAMBA-001') > 0
     AND (SELECT COUNT(*) FROM fleet_invitations fi
          JOIN fleets f ON f.id = fi.fleet_id
          WHERE f.name = 'Flotte ESAMBA' 
            AND fi.code = 'ESAMBA-2024') > 0
    THEN '✅ DONNÉES PRINCIPALES CRÉÉES'
    ELSE '❌ DONNÉES MANQUANTES'
  END as statut_global;

-- =====================================================
-- VÉRIFICATION SPÉCIALE : FLOTTE ESAMBA (DÉTAILS COMPLETS)
-- =====================================================

SELECT 
  '⭐ VÉRIFICATION DÉTAILLÉE FLOTTE ESAMBA ⭐' as titre,
  f.id as fleet_id,
  f.name as nom_flotte,
  f.collection_policy as politique,
  f.created_at as date_creation,
  o.id as org_id,
  o.name as organisation,
  o.country_code as pays,
  (SELECT COUNT(*) FROM vehicles v WHERE v.fleet_id = f.id) as nombre_vehicules,
  (SELECT COUNT(*) FROM fleet_invitations fi WHERE fi.fleet_id = f.id) as nombre_invitations,
  (SELECT COUNT(*) FROM fleet_memberships fm WHERE fm.fleet_id = f.id AND fm.is_active = true) as nombre_membres,
  CASE 
    WHEN f.id IS NOT NULL THEN '✅ FLOTTE EXISTE'
    ELSE '❌ FLOTTE N''EXISTE PAS'
  END as statut
FROM fleets f
LEFT JOIN orgs o ON o.id = f.org_id
WHERE f.name = 'Flotte ESAMBA';

-- =====================================================
-- RELATIONS COMPLÈTES : Flotte ESAMBA et ses dépendances
-- =====================================================

SELECT 
  'RELATIONS FLOTTE ESAMBA' as section,
  'Organisation' as type_relation,
  o.id as id_relation,
  o.name as nom_relation,
  '✅' as statut
FROM fleets f
JOIN orgs o ON o.id = f.org_id
WHERE f.name = 'Flotte ESAMBA'
UNION ALL
SELECT 
  'RELATIONS FLOTTE ESAMBA',
  'Véhicules',
  v.id::text,
  v.registration,
  '✅'
FROM fleets f
JOIN vehicles v ON v.fleet_id = f.id
WHERE f.name = 'Flotte ESAMBA'
UNION ALL
SELECT 
  'RELATIONS FLOTTE ESAMBA',
  'Invitations',
  fi.id::text,
  fi.code,
  '✅'
FROM fleets f
JOIN fleet_invitations fi ON fi.fleet_id = f.id
WHERE f.name = 'Flotte ESAMBA'
UNION ALL
SELECT 
  'RELATIONS FLOTTE ESAMBA',
  'Membres',
  fm.id::text,
  fm.role::text,
  CASE WHEN fm.is_active THEN '✅' ELSE '⚠️' END
FROM fleets f
JOIN fleet_memberships fm ON fm.fleet_id = f.id
WHERE f.name = 'Flotte ESAMBA'
ORDER BY type_relation, nom_relation;

-- =====================================================
-- TEST FINAL : Vérification avec fonction RPC (si disponible)
-- =====================================================

-- Note: Cette fonction nécessite un utilisateur authentifié
-- Si vous êtes connecté, décommentez cette section :
/*
SELECT 
  'TEST AVEC FONCTION RPC' as test,
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
  END as resultat
FROM check_esamba_2024();
*/
