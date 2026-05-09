-- =====================================================
-- ANALYSE DE LA STRUCTURE DE LA BASE DE DONNÉES
-- Smart Fleet Africa - Migration vers français
-- =====================================================
-- Ce script identifie toutes les tables, fonctions RPC et doublons
-- =====================================================

-- 1. LISTER TOUTES LES TABLES EXISTANTES
SELECT 
  'TABLES' as type,
  table_name as nom,
  table_schema as schema
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2. IDENTIFIER LES DOUBLONS POTENTIELS (tables similaires)
SELECT 
  'DOUBLONS_POTENTIELS' as type,
  table_name as nom_table,
  CASE 
    WHEN table_name IN ('fleets', 'flottes') THEN 'DOUBLON: fleets/flottes'
    WHEN table_name IN ('vehicles', 'vehicules') THEN 'DOUBLON: vehicles/vehicules'
    WHEN table_name IN ('profiles', 'profils') THEN 'DOUBLON: profiles/profils'
    WHEN table_name IN ('fleet_memberships', 'flotte_adhesions') THEN 'DOUBLON: fleet_memberships/flotte_adhesions'
    WHEN table_name IN ('fleet_invitations', 'flotte_invitations') THEN 'DOUBLON: fleet_invitations/flotte_invitations'
    WHEN table_name IN ('driver_vehicle_assignments', 'affectations_vehicules') THEN 'DOUBLON: driver_vehicle_assignments/affectations_vehicules'
    WHEN table_name IN ('driver_shift_closures', 'driver_shift_clotures') THEN 'DOUBLON: driver_shift_closures/driver_shift_clotures'
    WHEN table_name IN ('subscriptions', 'abonnements') THEN 'DOUBLON: subscriptions/abonnements'
    WHEN table_name IN ('payments', 'paiements') THEN 'DOUBLON: payments/paiements'
    WHEN table_name IN ('vehicle_entitlements', 'droits_vehicules') THEN 'DOUBLON: vehicle_entitlements/droits_vehicules'
    WHEN table_name IN ('orgs', 'organisations') THEN 'DOUBLON: orgs/organisations'
    ELSE 'OK'
  END as statut
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 3. LISTER TOUTES LES FONCTIONS RPC
SELECT 
  'FONCTIONS_RPC' as type,
  routine_name as nom_fonction,
  routine_type as type_fonction
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION'
ORDER BY routine_name;

-- 4. IDENTIFIER LES DOUBLONS DE FONCTIONS RPC
SELECT 
  'DOUBLONS_RPC' as type,
  routine_name as nom_fonction,
  CASE 
    WHEN routine_name = 'search_users' THEN 'VÉRIFIER DOUBLON'
    ELSE 'OK'
  END as statut
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION'
ORDER BY routine_name;

-- 5. COMPTER LES ENREGISTREMENTS PAR TABLE (pour identifier les tables avec données)
SELECT 
  'COMPTEURS' as type,
  table_name as nom_table,
  (SELECT COUNT(*) 
   FROM information_schema.columns 
   WHERE table_schema = 'public' 
     AND table_name = t.table_name) as nb_colonnes
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 6. LISTER TOUTES LES FOREIGN KEYS (pour comprendre les dépendances)
SELECT 
  'FOREIGN_KEYS' as type,
  tc.table_name as table_source,
  kcu.column_name as colonne_source,
  ccu.table_name as table_cible,
  ccu.column_name as colonne_cible,
  tc.constraint_name as nom_contrainte
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- 7. LISTER TOUTES LES POLITIQUES RLS
SELECT 
  'POLITIQUES_RLS' as type,
  schemaname as schema,
  tablename as table,
  policyname as nom_politique,
  permissive as type_permission,
  roles as roles,
  cmd as commande
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 8. LISTER TOUS LES INDEX
SELECT 
  'INDEX' as type,
  tablename as table,
  indexname as nom_index,
  indexdef as definition
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
