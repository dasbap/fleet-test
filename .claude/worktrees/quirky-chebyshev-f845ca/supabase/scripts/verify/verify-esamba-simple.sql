-- VÉRIFICATION SIMPLE DES DONNÉES ESAMBA
-- Smart Fleet Africa
-- Exécutez ce script dans Supabase SQL Editor

-- 1. Vérification Organisation ESAMBA
SELECT 
  'Organisation ESAMBA' as element,
  CASE WHEN COUNT(*) > 0 THEN 'CRÉÉE' ELSE 'ABSENTE' END as statut,
  COUNT(*) as nombre
FROM orgs
WHERE name = 'Organisation ESAMBA';

-- 2. Vérification Flotte ESAMBA (PRIORITAIRE)
SELECT 
  'Flotte ESAMBA' as element,
  CASE WHEN COUNT(*) > 0 THEN 'CRÉÉE' ELSE 'ABSENTE' END as statut,
  COUNT(*) as nombre,
  STRING_AGG(id::text, ', ') as ids
FROM fleets
WHERE name = 'Flotte ESAMBA';

-- 3. Détails Flotte ESAMBA
SELECT 
  f.id,
  f.name,
  f.collection_policy,
  o.name as organisation,
  f.created_at
FROM fleets f
LEFT JOIN orgs o ON o.id = f.org_id
WHERE f.name = 'Flotte ESAMBA';

-- 4. Vérification Véhicule ESAMBA-001
SELECT 
  'Véhicule ESAMBA-001' as element,
  CASE WHEN COUNT(*) > 0 THEN 'CRÉÉ' ELSE 'ABSENT' END as statut,
  COUNT(*) as nombre
FROM vehicles v
JOIN fleets f ON f.id = v.fleet_id
WHERE f.name = 'Flotte ESAMBA'
  AND v.registration = 'ESAMBA-001';

-- 5. Vérification Invitation ESAMBA-2024
SELECT 
  'Invitation ESAMBA-2024' as element,
  CASE WHEN COUNT(*) > 0 THEN 'CRÉÉE' ELSE 'ABSENTE' END as statut,
  COUNT(*) as nombre
FROM fleet_invitations fi
JOIN fleets f ON f.id = fi.fleet_id
WHERE f.name = 'Flotte ESAMBA'
  AND fi.code = 'ESAMBA-2024';

-- 6. Résumé global
SELECT 
  (SELECT COUNT(*) FROM orgs WHERE name = 'Organisation ESAMBA') as org_count,
  (SELECT COUNT(*) FROM fleets WHERE name = 'Flotte ESAMBA') as flotte_count,
  (SELECT COUNT(*) FROM vehicles v
   JOIN fleets f ON f.id = v.fleet_id
   WHERE f.name = 'Flotte ESAMBA' 
     AND v.registration = 'ESAMBA-001') as vehicule_count,
  (SELECT COUNT(*) FROM fleet_invitations fi
   JOIN fleets f ON f.id = fi.fleet_id
   WHERE f.name = 'Flotte ESAMBA' 
     AND fi.code = 'ESAMBA-2024') as invitation_count,
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
    THEN 'TOUT EST OK'
    ELSE 'PROBLÈME DÉTECTÉ'
  END as resultat;
