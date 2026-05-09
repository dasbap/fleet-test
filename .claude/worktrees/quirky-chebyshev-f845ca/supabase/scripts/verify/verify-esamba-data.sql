-- =====================================================
-- VÉRIFICATION DES DONNÉES ESAMBA-2024
-- Smart Fleet Africa
-- =====================================================
-- Exécutez ce script dans Supabase SQL Editor
-- pour vérifier que toutes les données ont été créées
-- =====================================================

-- 1) Vérifier l'Organisation ESAMBA
SELECT 
  'ORGANISATION' as type,
  id,
  name,
  country_code,
  created_at
FROM orgs
WHERE name = 'Organisation ESAMBA'
ORDER BY created_at DESC
LIMIT 1;

-- 2) Vérifier la Flotte ESAMBA
SELECT 
  'FLOTTE' as type,
  f.id,
  f.name,
  f.collection_policy,
  o.name as organisation_name,
  f.created_at
FROM fleets f
JOIN orgs o ON o.id = f.org_id
WHERE f.name = 'Flotte ESAMBA'
ORDER BY f.created_at DESC
LIMIT 1;

-- 3) Vérifier le Membership Organizer
SELECT 
  'MEMBERSHIP' as type,
  fm.id,
  fm.role,
  fm.is_active,
  f.name as fleet_name,
  u.email as user_email,
  fm.created_at
FROM fleet_memberships fm
JOIN fleets f ON f.id = fm.fleet_id
JOIN auth.users u ON u.id = fm.user_id
WHERE f.name = 'Flotte ESAMBA'
  AND fm.role = 'organizer'
  AND fm.is_active = true
ORDER BY fm.created_at DESC
LIMIT 1;

-- 4) Vérifier le Véhicule ESAMBA-001
SELECT 
  'VÉHICULE' as type,
  v.id,
  v.registration,
  v.brand,
  v.model,
  v.year,
  v.current_km,
  v.status,
  f.name as fleet_name,
  v.created_at
FROM vehicles v
JOIN fleets f ON f.id = v.fleet_id
WHERE v.registration = 'ESAMBA-001'
  AND f.name = 'Flotte ESAMBA'
ORDER BY v.created_at DESC
LIMIT 1;

-- 5) Vérifier l'Invitation ESAMBA-2024
SELECT 
  'INVITATION' as type,
  fi.id,
  fi.code,
  fi.current_uses,
  fi.max_uses,
  fi.expires_at,
  f.name as fleet_name,
  CASE 
    WHEN fi.max_uses IS NOT NULL AND fi.current_uses >= fi.max_uses THEN 'Limite atteinte'
    WHEN fi.expires_at IS NOT NULL AND fi.expires_at < NOW() THEN 'Expirée'
    ELSE 'Active'
  END as status,
  fi.created_at
FROM fleet_invitations fi
JOIN fleets f ON f.id = fi.fleet_id
WHERE fi.code = 'ESAMBA-2024'
  AND f.name = 'Flotte ESAMBA'
ORDER BY fi.created_at DESC
LIMIT 1;

-- =====================================================
-- RÉSUMÉ COMPLET
-- =====================================================
SELECT 
  'RÉSUMÉ' as type,
  (SELECT COUNT(*) FROM orgs WHERE name = 'Organisation ESAMBA') as nb_orgs,
  (SELECT COUNT(*) FROM fleets WHERE name = 'Flotte ESAMBA') as nb_fleets,
  (SELECT COUNT(*) FROM fleet_memberships fm 
   JOIN fleets f ON f.id = fm.fleet_id 
   WHERE f.name = 'Flotte ESAMBA' AND fm.role = 'organizer' AND fm.is_active = true) as nb_organizers,
  (SELECT COUNT(*) FROM vehicles v 
   JOIN fleets f ON f.id = v.fleet_id 
   WHERE v.registration = 'ESAMBA-001' AND f.name = 'Flotte ESAMBA') as nb_vehicles,
  (SELECT COUNT(*) FROM fleet_invitations fi 
   JOIN fleets f ON f.id = fi.fleet_id 
   WHERE fi.code = 'ESAMBA-2024' AND f.name = 'Flotte ESAMBA') as nb_invitations;
