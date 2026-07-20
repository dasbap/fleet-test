-- =====================================================
-- Correction des relations Supabase -> profils / incidents
-- Objectif : corriger les erreurs PGRST200 "no relationship found"
-- - scores_conducteurs ↔ profils
-- - affectations_vehicules ↔ profils
-- - incidents ↔ profils
-- - flotte_adhesions ↔ profils (page Équipes)
-- - travaux_maintenance ↔ incidents
-- =====================================================

BEGIN;

-- -----------------------------------------------------
-- 1. scores_conducteurs.driver_user_id → profils.user_id
--    (pour: driver:profils!scores_conducteurs_driver_user_id_fkey(...))
-- -----------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'scores_conducteurs_driver_user_id_fkey'
  ) THEN
    ALTER TABLE scores_conducteurs
      DROP CONSTRAINT scores_conducteurs_driver_user_id_fkey;
  END IF;

  ALTER TABLE scores_conducteurs
    ADD CONSTRAINT scores_conducteurs_driver_user_id_fkey
    FOREIGN KEY (driver_user_id) REFERENCES profils(user_id) ON DELETE CASCADE;
END $$;

-- -----------------------------------------------------
-- 2. affectations_vehicules.driver_user_id → profils.user_id
--    (pour: driver:profils!affectations_vehicules_driver_user_id_fkey(...))
-- -----------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'affectations_vehicules_driver_user_id_fkey'
  ) THEN
    ALTER TABLE affectations_vehicules
      DROP CONSTRAINT affectations_vehicules_driver_user_id_fkey;
  END IF;

  ALTER TABLE affectations_vehicules
    ADD CONSTRAINT affectations_vehicules_driver_user_id_fkey
    FOREIGN KEY (driver_user_id) REFERENCES profils(user_id) ON DELETE CASCADE;
END $$;

-- -----------------------------------------------------
-- 3. incidents.driver_user_id → profils.user_id
--    (pour: driver:profils!incidents_driver_user_id_fkey(...))
-- -----------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'incidents_driver_user_id_fkey'
  ) THEN
    ALTER TABLE incidents
      DROP CONSTRAINT incidents_driver_user_id_fkey;
  END IF;

  ALTER TABLE incidents
    ADD CONSTRAINT incidents_driver_user_id_fkey
    FOREIGN KEY (driver_user_id) REFERENCES profils(user_id);
END $$;

-- -----------------------------------------------------
-- 4. flotte_adhesions.user_id → profils.user_id
--    (pour: profile:profils!flotte_adhesions_user_id_fkey(...) - page Équipes)
-- -----------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'flotte_adhesions_user_id_fkey'
  ) THEN
    ALTER TABLE flotte_adhesions
      DROP CONSTRAINT flotte_adhesions_user_id_fkey;
  END IF;

  ALTER TABLE flotte_adhesions
    ADD CONSTRAINT flotte_adhesions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profils(user_id) ON DELETE CASCADE;
END $$;

-- -----------------------------------------------------
-- 5. travaux_maintenance.created_from_incident_id → incidents.id
--    (pour: incident:incidents!travaux_maintenance_created_from_incident_id_fkey(...) - Maintenance)
-- -----------------------------------------------------
DO $$
BEGIN
  -- Ajouter la colonne si elle n'existe pas encore
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'travaux_maintenance'
      AND column_name = 'created_from_incident_id'
  ) THEN
    ALTER TABLE travaux_maintenance
      ADD COLUMN created_from_incident_id uuid;
  END IF;

  -- Corriger / créer la contrainte de clé étrangère
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'travaux_maintenance_created_from_incident_id_fkey'
  ) THEN
    ALTER TABLE travaux_maintenance
      DROP CONSTRAINT travaux_maintenance_created_from_incident_id_fkey;
  END IF;

  ALTER TABLE travaux_maintenance
    ADD CONSTRAINT travaux_maintenance_created_from_incident_id_fkey
    FOREIGN KEY (created_from_incident_id) REFERENCES incidents(id) ON DELETE SET NULL;
END $$;

COMMIT;

