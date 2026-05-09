-- =====================================================
-- CORRECTION DES INDEX POUR FLEET_INVITATIONS
-- Smart Fleet Africa
-- =====================================================
-- Ce script corrige les index incorrects et crée les bons
-- =====================================================

-- =====================================================
-- ÉTAPE 1: Vérification de la structure de la table
-- =====================================================
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'fleet_invitations'
ORDER BY ordinal_position;

-- =====================================================
-- ÉTAPE 2: Suppression des index incorrects (s'ils existent)
-- =====================================================
-- Supprime les index qui référencent des colonnes inexistantes
DROP INDEX IF EXISTS idx_fleet_invitations_created_by_id;
DROP INDEX IF EXISTS idx_fleet_invitations_createdBy;
DROP INDEX IF EXISTS idx_fleet_invitations_created_by;

-- =====================================================
-- ÉTAPE 3: Vérification et création de la colonne created_by si nécessaire
-- =====================================================
-- Vérifie si la colonne created_by existe, sinon la crée
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'fleet_invitations' 
      AND column_name = 'created_by'
  ) THEN
    ALTER TABLE fleet_invitations
    ADD COLUMN created_by uuid REFERENCES auth.users(id);
    
    RAISE NOTICE 'Colonne created_by créée avec succès';
  ELSE
    RAISE NOTICE 'Colonne created_by existe déjà';
  END IF;
END $$;

-- =====================================================
-- ÉTAPE 4: Création de l'index correct pour created_by
-- =====================================================
-- Cet index optimise les requêtes : WHERE created_by = ?
-- Créé seulement si la colonne existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'fleet_invitations' 
      AND column_name = 'created_by'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_fleet_invitations_created_by
    ON fleet_invitations (created_by);
    
    RAISE NOTICE 'Index idx_fleet_invitations_created_by créé avec succès';
  ELSE
    RAISE WARNING 'Impossible de créer l''index : la colonne created_by n''existe pas';
  END IF;
END $$;

-- =====================================================
-- ÉTAPE 5: Vérification des index créés
-- =====================================================
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'fleet_invitations'
ORDER BY indexname;

-- =====================================================
-- NOTES
-- =====================================================
-- Ce script :
-- 1. Vérifie et crée la colonne created_by si elle n'existe pas
-- 2. Supprime les index incorrects (created_by_id, createdBy)
-- 3. Crée l'index correct sur created_by
-- 4. Affiche la liste des index finaux
