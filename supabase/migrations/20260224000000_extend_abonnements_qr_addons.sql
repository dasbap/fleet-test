-- =====================================================
-- Extension schéma abonnements / droits véhicules / QR / addons
-- Smart Fleet Africa - E-Samba
-- Date : 2026-02-24
-- 
-- Objectifs :
-- - Enrichir droits_vehicules pour modéliser une « licence véhicule »
-- - Enrichir jetons_qr pour gérer QR véhicule et QR lot
-- - Ajouter les addons d'abonnement et leur liaison
-- - Ajouter le journal des scans QR
-- - Ajouter un modèle simple de blocage disciplinaire
-- 
-- Toutes les opérations sont idempotentes (IF NOT EXISTS + vérifications information_schema)
-- ====================================================

BEGIN;

-- =====================================================
-- 1) Extension de droits_vehicules (licence par véhicule)
-- =====================================================

DO $$
BEGIN
  -- starts_at : début de validité de la licence véhicule
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'droits_vehicules'
      AND column_name = 'starts_at'
  ) THEN
    ALTER TABLE droits_vehicules
      ADD COLUMN starts_at timestamptz NOT NULL DEFAULT now();
  END IF;

  -- ends_at : fin de validité de la licence véhicule
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'droits_vehicules'
      AND column_name = 'ends_at'
  ) THEN
    ALTER TABLE droits_vehicules
      ADD COLUMN ends_at timestamptz NOT NULL DEFAULT now() + interval '30 days';
  END IF;

  -- status : statut fonctionnel de la licence (active/expired/revoked)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'droits_vehicules'
      AND column_name = 'status'
  ) THEN
    ALTER TABLE droits_vehicules
      ADD COLUMN status text NOT NULL DEFAULT 'active';
  END IF;

  -- is_premium : indicateur Premium (lié aux addons)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'droits_vehicules'
      AND column_name = 'is_premium'
  ) THEN
    ALTER TABLE droits_vehicules
      ADD COLUMN is_premium boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- =====================================================
-- 2) Extension de jetons_qr (QR véhicule / QR lot)
-- =====================================================

DO $$
BEGIN
  -- type : vehicle | lot
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'jetons_qr'
      AND column_name = 'type'
  ) THEN
    ALTER TABLE jetons_qr
      ADD COLUMN type text NOT NULL DEFAULT 'vehicle';
  END IF;

  -- fleet_id : flotte cible (obligatoire pour les QR lot)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'jetons_qr'
      AND column_name = 'fleet_id'
  ) THEN
    ALTER TABLE jetons_qr
      ADD COLUMN fleet_id uuid REFERENCES flottes(id) ON DELETE CASCADE;
  END IF;

  -- subscription_id : abonnement d'origine
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'jetons_qr'
      AND column_name = 'subscription_id'
  ) THEN
    ALTER TABLE jetons_qr
      ADD COLUMN subscription_id uuid REFERENCES abonnements(id) ON DELETE SET NULL;
  END IF;

  -- license_ids : licences couvertes (QR lot)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'jetons_qr'
      AND column_name = 'license_ids'
  ) THEN
    ALTER TABLE jetons_qr
      ADD COLUMN license_ids uuid[];
  END IF;

  -- action : activate | renew | reactivate
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'jetons_qr'
      AND column_name = 'action'
  ) THEN
    ALTER TABLE jetons_qr
      ADD COLUMN action text NOT NULL DEFAULT 'activate';
  END IF;

  -- max_uses : nombre max d'utilisations
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'jetons_qr'
      AND column_name = 'max_uses'
  ) THEN
    ALTER TABLE jetons_qr
      ADD COLUMN max_uses int NOT NULL DEFAULT 1;
  END IF;

  -- used_count : compteur d'utilisations
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'jetons_qr'
      AND column_name = 'used_count'
  ) THEN
    ALTER TABLE jetons_qr
      ADD COLUMN used_count int NOT NULL DEFAULT 0;
  END IF;
END $$;

-- =====================================================
-- 3) Addons d'abonnement et liaison abonnement/addon
-- =====================================================

CREATE TABLE IF NOT EXISTS addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  price_per_vehicle int NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS abonnements_addons (
  subscription_id uuid NOT NULL REFERENCES abonnements(id) ON DELETE CASCADE,
  addon_id uuid NOT NULL REFERENCES addons(id) ON DELETE CASCADE,
  quantity int NOT NULL DEFAULT 0,
  PRIMARY KEY (subscription_id, addon_id)
);

-- =====================================================
-- 4) Journal des scans de QR
-- =====================================================

CREATE TABLE IF NOT EXISTS journal_scans_qr (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_token_id uuid NOT NULL REFERENCES jetons_qr(id) ON DELETE CASCADE,
  scanned_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scanned_by_role role_type,
  scanned_at timestamptz NOT NULL DEFAULT now(),
  result text NOT NULL,
  details jsonb
);

CREATE INDEX IF NOT EXISTS idx_journal_scans_qr_token
  ON journal_scans_qr(qr_token_id);

CREATE INDEX IF NOT EXISTS idx_journal_scans_qr_user
  ON journal_scans_qr(scanned_by_user_id);

-- =====================================================
-- 5) Blocages disciplinaires
-- =====================================================

CREATE TABLE IF NOT EXISTS blocages_discipline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicules(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'active', -- active | lifted
  created_at timestamptz NOT NULL DEFAULT now(),
  lifted_at timestamptz,
  lifted_by_user_id uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_blocages_discipline_vehicle
  ON blocages_discipline(vehicle_id);

-- =====================================================
-- 6) RLS minimale sur les nouvelles tables / tables étendues
--    (sécurité : accès réservé aux rôles de flotte)
-- =====================================================

-- Addons : lecture catalogue pour tout utilisateur authentifié
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'addons'
  ) THEN
    ALTER TABLE addons ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS addons_select_authenticated ON addons;

    CREATE POLICY addons_select_authenticated ON addons
      FOR SELECT TO authenticated
      USING (true);
  END IF;
END $$;

-- Abonnements : lecture par manager/organizer de la flotte
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'abonnements'
  ) THEN
    ALTER TABLE abonnements ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS abonnements_select_manager_org ON abonnements;

    CREATE POLICY abonnements_select_manager_org ON abonnements
      FOR SELECT TO authenticated
      USING (has_role(fleet_id, 'manager'::public.role_type) OR has_role(fleet_id, 'organizer'::public.role_type));
  END IF;
END $$;

-- Droits_vehicules : lecture par manager/organizer de la flotte liée à l'abonnement
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'droits_vehicules'
  ) THEN
    ALTER TABLE droits_vehicules ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS droits_vehicules_select_manager_org ON droits_vehicules;

    CREATE POLICY droits_vehicules_select_manager_org ON droits_vehicules
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM abonnements a
          WHERE a.id = droits_vehicules.subscription_id
            AND (has_role(a.fleet_id, 'manager'::public.role_type) OR has_role(a.fleet_id, 'organizer'::public.role_type))
        )
      );
  END IF;
END $$;

-- Jetons_qr : lecture par manager/organizer de la flotte (via vehicule ou fleet_id)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'jetons_qr'
  ) THEN
    ALTER TABLE jetons_qr ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS jetons_qr_select_manager_org ON jetons_qr;

    CREATE POLICY jetons_qr_select_manager_org ON jetons_qr
      FOR SELECT TO authenticated
      USING (
        -- QR lié à un véhicule
        EXISTS (
          SELECT 1
          FROM vehicules v
          WHERE v.id = jetons_qr.vehicle_id
            AND (has_role(v.fleet_id, 'manager'::public.role_type) OR has_role(v.fleet_id, 'organizer'::public.role_type))
        )
        OR
        -- QR de lot lié directement à une flotte
        (jetons_qr.fleet_id IS NOT NULL AND (has_role(jetons_qr.fleet_id, 'manager'::public.role_type) OR has_role(jetons_qr.fleet_id, 'organizer'::public.role_type)))
      );
  END IF;
END $$;

-- Journal_scans_qr : lecture par manager/organizer de la flotte du véhicule concerné
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'journal_scans_qr'
  ) THEN
    ALTER TABLE journal_scans_qr ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS journal_scans_qr_select_manager_org ON journal_scans_qr;

    CREATE POLICY journal_scans_qr_select_manager_org ON journal_scans_qr
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM jetons_qr jq
          JOIN vehicules v ON v.id = jq.vehicle_id
          WHERE jq.id = journal_scans_qr.qr_token_id
            AND (has_role(v.fleet_id, 'manager'::public.role_type) OR has_role(v.fleet_id, 'organizer'::public.role_type))
        )
      );
  END IF;
END $$;

-- Blocages_discipline : lecture par manager/organizer/mécanicien
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'blocages_discipline'
  ) THEN
    ALTER TABLE blocages_discipline ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS blocages_discipline_select_roles ON blocages_discipline;

    CREATE POLICY blocages_discipline_select_roles ON blocages_discipline
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM vehicules v
          WHERE v.id = blocages_discipline.vehicle_id
            AND (
              has_role(v.fleet_id, 'manager'::public.role_type)
              OR has_role(v.fleet_id, 'organizer'::public.role_type)
              OR has_role(v.fleet_id, 'mechanic'::public.role_type)
            )
        )
      );
  END IF;
END $$;

COMMIT;

