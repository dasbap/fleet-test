-- =====================================================
-- CORRECTION COMPLÈTE DU SCHÉMA MÉTIER
-- Smart Fleet Africa - E-Samba
-- =====================================================
-- Cette migration corrige :
-- 1. Tables manquantes (organisations, flottes, profils, etc.)
-- 2. Colonnes manquantes dans vehicules
-- 3. Foreign Keys manquantes
-- 4. Extensions pour scores et alertes
-- =====================================================

BEGIN;

-- =====================================================
-- PHASE 1 : CRÉATION DES TABLES DE BASE MANQUANTES
-- =====================================================

-- Table organisations
CREATE TABLE IF NOT EXISTS organisations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  country_code text NOT NULL DEFAULT 'CM',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Table flottes
CREATE TABLE IF NOT EXISTS flottes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  name text NOT NULL,
  collection_policy text NOT NULL DEFAULT 'mix', -- cash|momo|mix
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Table profils
CREATE TABLE IF NOT EXISTS profils (
  user_id uuid PRIMARY KEY,
  full_name text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Table flotte_invitations
CREATE TABLE IF NOT EXISTS flotte_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_id uuid NOT NULL,
  code text NOT NULL,
  expires_at timestamptz,
  max_uses int,
  current_uses int NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Table affectations_vehicules
CREATE TABLE IF NOT EXISTS affectations_vehicules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_id uuid NOT NULL,
  vehicle_id uuid NOT NULL,
  driver_user_id uuid NOT NULL,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Table paiements
CREATE TABLE IF NOT EXISTS paiements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  provider text NOT NULL,
  amount int NOT NULL,
  currency text NOT NULL DEFAULT 'XAF',
  external_ref text,
  status text NOT NULL DEFAULT 'initiated', -- initiated|succeeded|failed
  idempotency_key text NOT NULL,
  raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider, idempotency_key)
);

-- Table abonnements
CREATE TABLE IF NOT EXISTS abonnements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_id uuid NOT NULL,
  plan_id uuid NOT NULL,
  payment_id uuid,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active'
);

-- Table droits_vehicules
CREATE TABLE IF NOT EXISTS droits_vehicules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL,
  subscription_id uuid NOT NULL,
  active boolean NOT NULL DEFAULT true,
  UNIQUE(vehicle_id, subscription_id)
);

-- =====================================================
-- PHASE 2 : CORRECTION DE LA TABLE VEHICULES
-- =====================================================

-- Ajouter les colonnes manquantes si elles n'existent pas
DO $$
BEGIN
  -- registration
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicules' 
    AND column_name = 'registration'
  ) THEN
    ALTER TABLE vehicules ADD COLUMN registration text;
  END IF;

  -- brand
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicules' 
    AND column_name = 'brand'
  ) THEN
    ALTER TABLE vehicules ADD COLUMN brand text;
  END IF;

  -- model
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicules' 
    AND column_name = 'model'
  ) THEN
    ALTER TABLE vehicules ADD COLUMN model text;
  END IF;

  -- year
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicules' 
    AND column_name = 'year'
  ) THEN
    ALTER TABLE vehicules ADD COLUMN year int;
  END IF;

  -- current_km
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicules' 
    AND column_name = 'current_km'
  ) THEN
    ALTER TABLE vehicules ADD COLUMN current_km int NOT NULL DEFAULT 0;
  END IF;

  -- blocked_reason
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicules' 
    AND column_name = 'blocked_reason'
  ) THEN
    ALTER TABLE vehicules ADD COLUMN blocked_reason text;
  END IF;

  -- created_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicules' 
    AND column_name = 'created_at'
  ) THEN
    ALTER TABLE vehicules ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
  END IF;
END $$;

-- Rendre registration NOT NULL si possible (après avoir ajouté des valeurs par défaut)
DO $$
BEGIN
  -- Mettre à jour les valeurs NULL avec une valeur par défaut
  UPDATE vehicules SET registration = 'UNKNOWN-' || id::text WHERE registration IS NULL;
  
  -- Rendre la colonne NOT NULL
  ALTER TABLE vehicules ALTER COLUMN registration SET NOT NULL;
EXCEPTION
  WHEN OTHERS THEN
    -- Si erreur, on continue
    NULL;
END $$;

-- Corriger le type de status pour utiliser l'enum vehicle_status
DO $$
BEGIN
  -- Vérifier si le type est déjà correct
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicules' 
    AND column_name = 'status'
    AND data_type = 'USER-DEFINED'
    AND udt_name = 'vehicle_status'
  ) THEN
    -- Déjà correct, rien à faire
    RETURN;
  END IF;

  -- Convertir les valeurs text en enum
  UPDATE vehicules SET status = 'ok'::vehicle_status WHERE status::text NOT IN ('ok', 'blocked');
  UPDATE vehicules SET status = 'blocked'::vehicle_status WHERE status::text = 'blocked';
  
  -- Changer le type de la colonne
  ALTER TABLE vehicules ALTER COLUMN status TYPE vehicle_status USING status::text::vehicle_status;
EXCEPTION
  WHEN OTHERS THEN
    -- Si erreur, on continue
    NULL;
END $$;

-- Ajouter contrainte unique (fleet_id, registration) si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'vehicules_fleet_id_registration_key'
  ) THEN
    ALTER TABLE vehicules ADD CONSTRAINT vehicules_fleet_id_registration_key 
    UNIQUE (fleet_id, registration);
  END IF;
END $$;

-- =====================================================
-- PHASE 3 : AJOUT DES FOREIGN KEYS MANQUANTES
-- =====================================================

-- Les bases historiques peuvent contenir des lignes orphelines.
-- NOT VALID ajoute la protection pour les nouvelles écritures sans inventer
-- ou supprimer de données existantes pendant une migration de production.

-- FK flottes.org_id → organisations.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'flottes_org_id_fkey'
  ) THEN
    ALTER TABLE flottes ADD CONSTRAINT flottes_org_id_fkey 
    FOREIGN KEY (org_id) REFERENCES organisations(id) ON DELETE CASCADE NOT VALID;
  END IF;
END $$;

-- FK profils.user_id → auth.users.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profils_user_id_fkey'
  ) THEN
    ALTER TABLE profils ADD CONSTRAINT profils_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;
  END IF;
END $$;

-- FK flotte_adhesions.fleet_id → flottes.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'flotte_adhesions_fleet_id_fkey'
  ) THEN
    ALTER TABLE flotte_adhesions ADD CONSTRAINT flotte_adhesions_fleet_id_fkey 
    FOREIGN KEY (fleet_id) REFERENCES flottes(id) ON DELETE CASCADE NOT VALID;
  END IF;
END $$;

-- FK flotte_adhesions.user_id → auth.users.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'flotte_adhesions_user_id_fkey'
  ) THEN
    ALTER TABLE flotte_adhesions ADD CONSTRAINT flotte_adhesions_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;
  END IF;
END $$;

-- FK flotte_invitations.fleet_id → flottes.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'flotte_invitations_fleet_id_fkey'
  ) THEN
    ALTER TABLE flotte_invitations ADD CONSTRAINT flotte_invitations_fleet_id_fkey 
    FOREIGN KEY (fleet_id) REFERENCES flottes(id) ON DELETE CASCADE NOT VALID;
  END IF;
END $$;

-- FK flotte_invitations.created_by → auth.users.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'flotte_invitations_created_by_fkey'
  ) THEN
    ALTER TABLE flotte_invitations ADD CONSTRAINT flotte_invitations_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES auth.users(id) NOT VALID;
  END IF;
END $$;

-- FK vehicules.fleet_id → flottes.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'vehicules_fleet_id_fkey'
  ) THEN
    ALTER TABLE vehicules ADD CONSTRAINT vehicules_fleet_id_fkey 
    FOREIGN KEY (fleet_id) REFERENCES flottes(id) ON DELETE CASCADE NOT VALID;
  END IF;
END $$;

-- FK affectations_vehicules.fleet_id → flottes.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'affectations_vehicules_fleet_id_fkey'
  ) THEN
    ALTER TABLE affectations_vehicules ADD CONSTRAINT affectations_vehicules_fleet_id_fkey 
    FOREIGN KEY (fleet_id) REFERENCES flottes(id) ON DELETE CASCADE NOT VALID;
  END IF;
END $$;

-- FK affectations_vehicules.vehicle_id → vehicules.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'affectations_vehicules_vehicle_id_fkey'
  ) THEN
    ALTER TABLE affectations_vehicules ADD CONSTRAINT affectations_vehicules_vehicle_id_fkey 
    FOREIGN KEY (vehicle_id) REFERENCES vehicules(id) ON DELETE CASCADE NOT VALID;
  END IF;
END $$;

-- FK affectations_vehicules.driver_user_id → auth.users.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'affectations_vehicules_driver_user_id_fkey'
  ) THEN
    ALTER TABLE affectations_vehicules ADD CONSTRAINT affectations_vehicules_driver_user_id_fkey 
    FOREIGN KEY (driver_user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;
  END IF;
END $$;

-- FK affectations_vehicules.created_by → auth.users.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'affectations_vehicules_created_by_fkey'
  ) THEN
    ALTER TABLE affectations_vehicules ADD CONSTRAINT affectations_vehicules_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES auth.users(id) NOT VALID;
  END IF;
END $$;

-- FK creneaux_conducteurs.assignment_id → affectations_vehicules.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'creneaux_conducteurs_assignment_id_fkey'
  ) THEN
    ALTER TABLE creneaux_conducteurs ADD CONSTRAINT creneaux_conducteurs_assignment_id_fkey 
    FOREIGN KEY (assignment_id) REFERENCES affectations_vehicules(id) ON DELETE RESTRICT NOT VALID;
  END IF;
END $$;

-- FK clotures_creneaux.validated_by → auth.users.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'clotures_creneaux_validated_by_fkey'
  ) THEN
    ALTER TABLE clotures_creneaux ADD CONSTRAINT clotures_creneaux_validated_by_fkey 
    FOREIGN KEY (validated_by) REFERENCES auth.users(id) NOT VALID;
  END IF;
END $$;

-- FK incidents.vehicle_id → vehicules.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'incidents_vehicle_id_fkey'
  ) THEN
    ALTER TABLE incidents ADD CONSTRAINT incidents_vehicle_id_fkey 
    FOREIGN KEY (vehicle_id) REFERENCES vehicules(id) ON DELETE CASCADE NOT VALID;
  END IF;
END $$;

-- FK incidents.driver_user_id → auth.users.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'incidents_driver_user_id_fkey'
  ) THEN
    ALTER TABLE incidents ADD CONSTRAINT incidents_driver_user_id_fkey 
    FOREIGN KEY (driver_user_id) REFERENCES auth.users(id) NOT VALID;
  END IF;
END $$;

-- FK travaux_maintenance.fleet_id → flottes.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'travaux_maintenance_fleet_id_fkey'
  ) THEN
    ALTER TABLE travaux_maintenance ADD CONSTRAINT travaux_maintenance_fleet_id_fkey 
    FOREIGN KEY (fleet_id) REFERENCES flottes(id) ON DELETE CASCADE NOT VALID;
  END IF;
END $$;

-- FK travaux_maintenance.vehicle_id → vehicules.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'travaux_maintenance_vehicle_id_fkey'
  ) THEN
    ALTER TABLE travaux_maintenance ADD CONSTRAINT travaux_maintenance_vehicle_id_fkey 
    FOREIGN KEY (vehicle_id) REFERENCES vehicules(id) ON DELETE CASCADE NOT VALID;
  END IF;
END $$;

-- FK preuves_maintenance.created_by → auth.users.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'preuves_maintenance_created_by_fkey'
  ) THEN
    ALTER TABLE preuves_maintenance ADD CONSTRAINT preuves_maintenance_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES auth.users(id) NOT VALID;
  END IF;
END $$;

-- FK listes_verification_maintenance.signed_by → auth.users.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'listes_verification_maintenance_signed_by_fkey'
  ) THEN
    ALTER TABLE listes_verification_maintenance ADD CONSTRAINT listes_verification_maintenance_signed_by_fkey 
    FOREIGN KEY (signed_by) REFERENCES auth.users(id) NOT VALID;
  END IF;
END $$;

-- FK paiements.org_id → organisations.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'paiements_org_id_fkey'
  ) THEN
    ALTER TABLE paiements ADD CONSTRAINT paiements_org_id_fkey 
    FOREIGN KEY (org_id) REFERENCES organisations(id) ON DELETE CASCADE NOT VALID;
  END IF;
END $$;

-- FK abonnements.fleet_id → flottes.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'abonnements_fleet_id_fkey'
  ) THEN
    ALTER TABLE abonnements ADD CONSTRAINT abonnements_fleet_id_fkey 
    FOREIGN KEY (fleet_id) REFERENCES flottes(id) ON DELETE CASCADE NOT VALID;
  END IF;
END $$;

-- FK abonnements.plan_id → plans.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'abonnements_plan_id_fkey'
  ) THEN
    ALTER TABLE abonnements ADD CONSTRAINT abonnements_plan_id_fkey 
    FOREIGN KEY (plan_id) REFERENCES plans(id) NOT VALID;
  END IF;
END $$;

-- FK abonnements.payment_id → paiements.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'abonnements_payment_id_fkey'
  ) THEN
    ALTER TABLE abonnements ADD CONSTRAINT abonnements_payment_id_fkey 
    FOREIGN KEY (payment_id) REFERENCES paiements(id) NOT VALID;
  END IF;
END $$;

-- FK droits_vehicules.vehicle_id → vehicules.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'droits_vehicules_vehicle_id_fkey'
  ) THEN
    ALTER TABLE droits_vehicules ADD CONSTRAINT droits_vehicules_vehicle_id_fkey 
    FOREIGN KEY (vehicle_id) REFERENCES vehicules(id) ON DELETE CASCADE NOT VALID;
  END IF;
END $$;

-- FK droits_vehicules.subscription_id → abonnements.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'droits_vehicules_subscription_id_fkey'
  ) THEN
    ALTER TABLE droits_vehicules ADD CONSTRAINT droits_vehicules_subscription_id_fkey 
    FOREIGN KEY (subscription_id) REFERENCES abonnements(id) ON DELETE CASCADE NOT VALID;
  END IF;
END $$;

-- FK jetons_qr.vehicle_id → vehicules.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'jetons_qr_vehicle_id_fkey'
  ) THEN
    ALTER TABLE jetons_qr ADD CONSTRAINT jetons_qr_vehicle_id_fkey 
    FOREIGN KEY (vehicle_id) REFERENCES vehicules(id) ON DELETE CASCADE NOT VALID;
  END IF;
END $$;

-- FK jetons_qr.created_by → auth.users.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'jetons_qr_created_by_fkey'
  ) THEN
    ALTER TABLE jetons_qr ADD CONSTRAINT jetons_qr_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES auth.users(id) NOT VALID;
  END IF;
END $$;

-- Contrainte unique pour flotte_invitations.code
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'flotte_invitations_code_key'
  ) THEN
    ALTER TABLE flotte_invitations ADD CONSTRAINT flotte_invitations_code_key 
    UNIQUE (code);
  END IF;
END $$;

-- Contrainte unique pour flotte_adhesions (fleet_id, user_id, role)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'flotte_adhesions_fleet_id_user_id_role_key'
  ) THEN
    ALTER TABLE flotte_adhesions ADD CONSTRAINT flotte_adhesions_fleet_id_user_id_role_key 
    UNIQUE (fleet_id, user_id, role);
  END IF;
END $$;

-- Index unique pour affectations actives par conducteur
CREATE UNIQUE INDEX IF NOT EXISTS une_affectation_active_par_conducteur
ON affectations_vehicules(driver_user_id)
WHERE is_active = true;

-- Index unique pour affectations actives par véhicule
CREATE UNIQUE INDEX IF NOT EXISTS une_affectation_active_par_vehicule
ON affectations_vehicules(vehicle_id)
WHERE is_active = true;

COMMIT;
