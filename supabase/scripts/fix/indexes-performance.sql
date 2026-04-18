-- =====================================================
-- INDEXES DE PERFORMANCE POUR FLEET_MEMBERSHIPS
-- Smart Fleet Africa
-- =====================================================
-- Exécutez ce fichier dans Supabase SQL Editor
-- =====================================================
-- Ces index optimisent les requêtes fréquentes sur fleet_memberships
-- =====================================================

-- =====================================================
-- INDEX 1: Index composite pour user_id + is_active
-- =====================================================
-- Optimise les requêtes : WHERE user_id = ? AND is_active = true
-- Utilisé par useAuth() pour récupérer les membreships actifs
-- Remplace l'index simple idx_fleet_memberships_user_id si nécessaire

DROP INDEX IF EXISTS idx_fleet_memberships_user_active;
CREATE INDEX idx_fleet_memberships_user_active 
ON fleet_memberships (user_id, is_active);

-- =====================================================
-- INDEX 2: Index de couverture pour user_id + is_active
-- =====================================================
-- Index de couverture qui inclut fleet_id et role
-- Évite les lookups supplémentaires vers la table
-- Améliore les performances des jointures avec fleets
-- PostgreSQL 11+ requis pour INCLUDE

DROP INDEX IF EXISTS idx_fleet_memberships_user_active_covering;
CREATE INDEX idx_fleet_memberships_user_active_covering
ON fleet_memberships (user_id, is_active) 
INCLUDE (fleet_id, role);

-- =====================================================
-- INDEX 3: Index pour fleet_id (déjà présent dans schema.sql)
-- =====================================================
-- Optimise les requêtes : WHERE fleet_id = ?
-- Utilisé pour récupérer tous les membres d'une flotte
-- Déjà créé dans schema.sql comme idx_fleet_memberships_fleet_id
-- Pas besoin de le recréer, mais on le documente ici

-- =====================================================
-- INDEX 4: Index composite pour fleet_id + role + is_active
-- =====================================================
-- Optimise les requêtes : WHERE fleet_id = ? AND role = ? AND is_active = true
-- Utilisé pour filtrer les membres par rôle dans une flotte
-- Exemple : récupérer tous les drivers actifs d'une flotte

DROP INDEX IF EXISTS idx_fleet_memberships_fleet_role_active;
CREATE INDEX idx_fleet_memberships_fleet_role_active
ON fleet_memberships (fleet_id, role, is_active);

-- =====================================================
-- INDEX 5: Index pour fleets.id (vérification)
-- =====================================================
-- fleets.id est déjà une PRIMARY KEY, donc indexé automatiquement
-- Cet index est créé uniquement pour documentation
-- Aucune action nécessaire si id est déjà PK

-- Vérification : fleets.id devrait déjà être indexé (PK)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_indexes 
    WHERE tablename = 'fleets' 
      AND indexname = 'fleets_pkey'
  ) THEN
    RAISE NOTICE 'ATTENTION: fleets.id devrait être une PRIMARY KEY';
  ELSE
    RAISE NOTICE 'OK: fleets.id est déjà indexé (PRIMARY KEY)';
  END IF;
END $$;

-- =====================================================
-- INDEX 6: Index pour fleet_invitations.fleet_id
-- =====================================================
-- Optimise les requêtes sur les invitations par flotte

CREATE INDEX IF NOT EXISTS idx_fleet_invitations_fleet_id
ON fleet_invitations (fleet_id);

-- =====================================================
-- INDEX 7: Index pour fleet_invitations.code
-- =====================================================
-- Optimise la recherche par code d'invitation
-- (code est déjà UNIQUE, donc indexé, mais on le documente)

CREATE INDEX IF NOT EXISTS idx_fleet_invitations_code
ON fleet_invitations (code);

-- =====================================================
-- INDEX 8: Index pour invitations par created_by
-- =====================================================
-- Optimise les requêtes : WHERE created_by = ?

CREATE INDEX IF NOT EXISTS idx_fleet_invitations_created_by
ON fleet_invitations (created_by);

-- =====================================================
-- INDEX 9: Index pour driver_vehicle_assignments
-- =====================================================
-- Optimise les requêtes sur les affectations

CREATE INDEX IF NOT EXISTS idx_assignments_driver_active
ON driver_vehicle_assignments (driver_user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_assignments_vehicle_active
ON driver_vehicle_assignments (vehicle_id, is_active);

CREATE INDEX IF NOT EXISTS idx_assignments_fleet_active
ON driver_vehicle_assignments (fleet_id, is_active);

-- =====================================================
-- INDEX 10: Index pour driver_shifts
-- =====================================================
-- Optimise les requêtes sur les shifts

CREATE INDEX IF NOT EXISTS idx_shifts_assignment_status
ON driver_shifts (assignment_id, status);

-- =====================================================
-- VÉRIFICATION DES INDEX CRÉÉS
-- =====================================================

-- Voir tous les index créés pour fleet_memberships
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'fleet_memberships'
ORDER BY indexname;

-- Voir tous les index créés pour fleets
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'fleets'
ORDER BY indexname;

-- Statistiques sur les index
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as "Nombre d'utilisations",
  idx_tup_read as "Tuples lus",
  idx_tup_fetch as "Tuples récupérés"
FROM pg_stat_user_indexes
WHERE tablename IN ('fleet_memberships', 'fleets', 'fleet_invitations')
ORDER BY idx_scan DESC;

-- =====================================================
-- NOTES
-- =====================================================

-- Les index INCLUDE (index de couverture) sont disponibles depuis PostgreSQL 11
-- Ils permettent d'inclure des colonnes supplémentaires dans l'index
-- sans les utiliser pour le tri, ce qui évite les lookups vers la table

-- Les index partiels (avec WHERE) permettent de créer des index plus petits
-- en ne stockant que les lignes qui correspondent à la condition

-- =====================================================
-- MISE À JOUR DES STATISTIQUES
-- =====================================================
-- Exécutez ANALYZE après avoir créé les index pour mettre à jour
-- les statistiques du planificateur de requêtes

ANALYZE fleet_memberships;
ANALYZE fleets;
ANALYZE fleet_invitations;
ANALYZE driver_vehicle_assignments;
ANALYZE driver_shifts;
