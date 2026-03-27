-- =====================================================
-- Schéma métier minimal pour base vierge (greenfield)
-- =====================================================
-- Les migrations historiques supposaient une base déjà peuplée (tables anglaises).
-- Sur une DB neuve (CI, nouveau clone), `vehicules` n'existait pas avant
-- `migrate_to_french`, ce qui faisait échouer `affecter_vehicule`.
-- Ce fichier reprend les définitions de `supabase/baseline/00000000000000_baseline_schema.sql`
-- et ne s'exécute que si aucune table `vehicules` / `vehicles` n'est encore présente.
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Énumérations (idempotentes, alignées sur la baseline)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role_type') THEN
    CREATE TYPE role_type AS ENUM ('organizer','manager','driver','mechanic');
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vehicle_status') THEN
    CREATE TYPE vehicle_status AS ENUM ('ok','blocked');
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'closure_status') THEN
    CREATE TYPE closure_status AS ENUM ('pending','validated','rejected');
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name IN ('vehicules', 'vehicles')
  ) THEN

  EXECUTE $ddl$
CREATE TABLE organisations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  country_code text NOT NULL DEFAULT 'CM',
  created_at timestamptz NOT NULL DEFAULT now()
  );
  $ddl$;

  EXECUTE $ddl$
CREATE TABLE flottes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name text NOT NULL,
  collection_policy text NOT NULL DEFAULT 'mix',
  created_at timestamptz NOT NULL DEFAULT now()
  );
  $ddl$;

  EXECUTE $ddl$
CREATE TABLE profils (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now()
  );
  $ddl$;

  EXECUTE $ddl$
CREATE TABLE flotte_adhesions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_id uuid NOT NULL REFERENCES flottes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role role_type NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fleet_id, user_id, role)
  );
  $ddl$;

  EXECUTE $ddl$
CREATE TABLE flotte_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_id uuid NOT NULL REFERENCES flottes(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  expires_at timestamptz,
  max_uses int,
  current_uses int NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
  );
  $ddl$;

  EXECUTE $ddl$
CREATE TABLE vehicules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_id uuid NOT NULL REFERENCES flottes(id) ON DELETE CASCADE,
  registration text NOT NULL,
  brand text,
  model text,
  year int,
  current_km int NOT NULL DEFAULT 0,
  status vehicle_status NOT NULL DEFAULT 'ok',
  blocked_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fleet_id, registration)
  );
  $ddl$;

  EXECUTE $ddl$
CREATE TABLE affectations_vehicules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_id uuid NOT NULL REFERENCES flottes(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES vehicules(id) ON DELETE CASCADE,
  driver_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
  );
  $ddl$;

  EXECUTE $ddl$
CREATE UNIQUE INDEX une_affectation_active_par_conducteur
ON affectations_vehicules(driver_user_id)
WHERE is_active = true;
  $ddl$;

  EXECUTE $ddl$
CREATE UNIQUE INDEX une_affectation_active_par_vehicule
ON affectations_vehicules(vehicle_id)
WHERE is_active = true;
  $ddl$;

  EXECUTE $ddl$
CREATE TABLE creneaux_conducteurs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES affectations_vehicules(id) ON DELETE RESTRICT,
  km_start int NOT NULL,
  km_end int,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  status text NOT NULL DEFAULT 'open'
  );
  $ddl$;

  EXECUTE $ddl$
CREATE TABLE clotures_creneaux (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id uuid NOT NULL REFERENCES creneaux_conducteurs(id) ON DELETE CASCADE,
  revenue_declared int NOT NULL,
  collection_mode text NOT NULL,
  proof_type text NOT NULL,
  proof_value text NOT NULL,
  status closure_status NOT NULL DEFAULT 'pending',
  validated_by uuid REFERENCES auth.users(id),
  validated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shift_id)
  );
  $ddl$;

  EXECUTE $ddl$
CREATE TABLE incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicules(id) ON DELETE CASCADE,
  driver_user_id uuid NOT NULL REFERENCES auth.users(id),
  severity text NOT NULL DEFAULT 'medium',
  description text NOT NULL,
  evidence_path text,
  created_at timestamptz NOT NULL DEFAULT now()
  );
  $ddl$;

  EXECUTE $ddl$
CREATE TABLE travaux_maintenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicules(id) ON DELETE CASCADE,
  fleet_id uuid NOT NULL REFERENCES flottes(id) ON DELETE CASCADE,
  created_from_incident_id uuid REFERENCES incidents(id),
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'queued',
  created_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
  );
  $ddl$;

  EXECUTE $ddl$
CREATE TABLE preuves_maintenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES travaux_maintenance(id) ON DELETE CASCADE,
  kind text NOT NULL,
  file_path text NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
  );
  $ddl$;

  EXECUTE $ddl$
CREATE TABLE listes_verification_maintenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES travaux_maintenance(id) ON DELETE CASCADE,
  items jsonb NOT NULL,
  signed_by uuid NOT NULL REFERENCES auth.users(id),
  signed_at timestamptz NOT NULL DEFAULT now()
  );
  $ddl$;

  EXECUTE $ddl$
CREATE TABLE plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  price_per_vehicle int NOT NULL,
  min_commitment_days int NOT NULL DEFAULT 60,
  is_active boolean NOT NULL DEFAULT true
  );
  $ddl$;

  EXECUTE $ddl$
CREATE TABLE paiements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  provider text NOT NULL,
  amount int NOT NULL,
  currency text NOT NULL DEFAULT 'XAF',
  external_ref text,
  status text NOT NULL DEFAULT 'initiated',
  idempotency_key text NOT NULL,
  raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider, idempotency_key)
  );
  $ddl$;

  EXECUTE $ddl$
CREATE TABLE abonnements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_id uuid NOT NULL REFERENCES flottes(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES plans(id),
  payment_id uuid REFERENCES paiements(id),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active'
  );
  $ddl$;

  EXECUTE $ddl$
CREATE TABLE droits_vehicules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicules(id) ON DELETE CASCADE,
  subscription_id uuid NOT NULL REFERENCES abonnements(id) ON DELETE CASCADE,
  active boolean NOT NULL DEFAULT true,
  UNIQUE(vehicle_id, subscription_id)
  );
  $ddl$;

  EXECUTE $ddl$
CREATE TABLE jetons_qr (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES vehicules(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  scope text NOT NULL DEFAULT 'subscription',
  expires_at timestamptz NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
  );
  $ddl$;

  END IF;
END;
$$;
