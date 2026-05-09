-- Test de la fonction check_esamba_2024
-- Vérifie que la fonction retourne les bonnes valeurs

-- Test 1 : Vérifier que la fonction existe
SELECT 
  proname as function_name,
  proargnames as parameters,
  prorettype::regtype as return_type
FROM pg_proc
WHERE proname = 'check_esamba_2024';

-- Test 2 : Vérifier directement les données
SELECT 
  'Vérification directe' as test,
  (SELECT COUNT(*) > 0 FROM orgs WHERE name = 'Organisation ESAMBA') as organisation_directe,
  (SELECT COUNT(*) > 0 FROM fleets WHERE name = 'Flotte ESAMBA') as flotte_directe,
  (SELECT COUNT(*) > 0 FROM vehicles v
   JOIN fleets f ON f.id = v.fleet_id
   WHERE f.name = 'Flotte ESAMBA' 
     AND v.registration = 'ESAMBA-001') as vehicule_directe,
  (SELECT COUNT(*) > 0 FROM fleet_invitations fi
   JOIN fleets f ON f.id = fi.fleet_id
   WHERE f.name = 'Flotte ESAMBA' 
     AND fi.code = 'ESAMBA-2024') as invitation_directe;

-- Test 3 : Vérifier les permissions RLS sur fleets
SELECT 
  tablename,
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'fleets';

-- Test 4 : Vérifier si RLS est activé sur fleets
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_active
FROM pg_tables
WHERE tablename = 'fleets'
  AND schemaname = 'public';

-- Test 5 : Tester la fonction (nécessite un utilisateur authentifié)
-- Décommentez si vous êtes connecté :
/*
SELECT * FROM check_esamba_2024();
*/
