-- =====================================================
-- VÉRIFICATION COMPLÈTE DE FLEET_INVITATIONS
-- Smart Fleet Africa
-- =====================================================
-- Ce script vérifie la structure et les index de la table
-- =====================================================

-- =====================================================
-- 1. Structure de la table
-- =====================================================
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'fleet_invitations'
ORDER BY ordinal_position;

-- =====================================================
-- 2. Index existants sur la table
-- =====================================================
SELECT 
  indexname,
  indexdef,
  CASE 
    WHEN indexname LIKE '%created_by%' OR indexname LIKE '%createdBy%' OR indexname LIKE '%created_by_id%'
    THEN '⚠️ Index lié à created_by'
    ELSE '✓ Index normal'
  END as statut
FROM pg_indexes
WHERE tablename = 'fleet_invitations'
ORDER BY indexname;

-- =====================================================
-- 3. Vérification des colonnes référencées par les index
-- =====================================================
SELECT 
  i.indexname,
  i.indexdef,
  CASE 
    WHEN i.indexdef LIKE '%created_by_id%' AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'fleet_invitations' 
      AND column_name = 'created_by_id'
    ) THEN '❌ ERREUR: Colonne created_by_id n''existe pas'
    WHEN i.indexdef LIKE '%"createdBy"%' AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'fleet_invitations' 
      AND column_name = 'createdBy'
    ) THEN '❌ ERREUR: Colonne createdBy n''existe pas'
    WHEN i.indexdef LIKE '%created_by%' AND EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'fleet_invitations' 
      AND column_name = 'created_by'
    ) THEN '✓ OK: Index sur created_by valide'
    ELSE '✓ OK'
  END as validation
FROM pg_indexes i
WHERE i.tablename = 'fleet_invitations'
  AND (i.indexdef LIKE '%created_by%' OR i.indexdef LIKE '%createdBy%')
ORDER BY i.indexname;

-- =====================================================
-- 4. Statistiques d'utilisation des index
-- =====================================================
SELECT 
  schemaname,
  tablename,
  indexrelname AS index_name,
  idx_scan AS nombre_utilisations,
  idx_tup_read AS tuples_lus,
  idx_tup_fetch AS tuples_recuperes,
  CASE 
    WHEN idx_scan = 0 THEN '⚠️ Jamais utilisé'
    WHEN idx_scan < 10 THEN '⚠️ Rarement utilisé'
    ELSE '✓ Utilisé'
  END as statut_utilisation
FROM pg_stat_user_indexes
WHERE tablename = 'fleet_invitations'
ORDER BY idx_scan ASC;

-- =====================================================
-- 5. Contraintes et clés étrangères
-- =====================================================
SELECT 
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'fleet_invitations'
  AND tc.table_schema = 'public'
ORDER BY tc.constraint_type, tc.constraint_name;
