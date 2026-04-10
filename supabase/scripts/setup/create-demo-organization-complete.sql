-- =====================================================
-- DEMO : Organisation complète E-Samba (tous rôles)
-- Smart Fleet Africa
-- =====================================================
-- Objectif :
-- Créer un jeu de données de démonstration complet :
-- - 1 organisation
-- - 3 flottes (Starter / Pro / Organisateur)
-- - Profils utilisateurs (organizer, managers, drivers, mechanics)
-- - Plans, abonnements, droits_vehicules, addons, abonnements_addons
-- - Quelques jetons_qr et entrées de journal_scans_qr
--
-- À exécuter dans Supabase SQL Editor, idéalement sur une base de test.
-- Certains INSERT dans auth.users nécessitent le rôle service_role.
-- PRÉREQUIS : schéma E-Samba (organisations, flottes, plans, abonnements, droits_vehicules, jetons_qr, etc.).
-- Si la migration 20260224000000_extend_abonnements_qr_addons n'a pas été appliquée, les tables addons/abonnements_addons sont créées ci-dessous.
-- =====================================================

-- Extension requise pour crypt/gen_salt (mot de passe démo) ; hors transaction.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

BEGIN;

-- -----------------------------------------------------
-- EXÉCUTION DU SCRIPT DE DÉMO ORGANISATION E-SAMBA
-- -----------------------------------------------------

-- [Toutes les instructions suivantes créent et initialisent l'ensemble des données de démo E-Samba.]

-- 0) Extension droits_vehicules / jetons_qr si colonnes manquantes (aligné sur migration 20260224000000_extend_abonnements_qr_addons)
DO $$
BEGIN
  -- starts_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'droits_vehicules' AND column_name = 'starts_at'
  ) THEN
    ALTER TABLE droits_vehicules ADD COLUMN starts_at timestamptz NOT NULL DEFAULT now();
  END IF;
  -- ends_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'droits_vehicules' AND column_name = 'ends_at'
  ) THEN
    ALTER TABLE droits_vehicules ADD COLUMN ends_at timestamptz NOT NULL DEFAULT now() + interval '30 days';
  END IF;
  -- status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'droits_vehicules' AND column_name = 'status'
  ) THEN
    ALTER TABLE droits_vehicules ADD COLUMN status text NOT NULL DEFAULT 'active';
  END IF;
  -- is_premium
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'droits_vehicules' AND column_name = 'is_premium'
  ) THEN
    ALTER TABLE droits_vehicules ADD COLUMN is_premium boolean NOT NULL DEFAULT false;
  END IF;
  -- type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'jetons_qr' AND column_name = 'type'
  ) THEN
    ALTER TABLE jetons_qr ADD COLUMN type text NOT NULL DEFAULT 'vehicle';
  END IF;
  -- fleet_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'jetons_qr' AND column_name = 'fleet_id'
  ) THEN
    ALTER TABLE jetons_qr ADD COLUMN fleet_id uuid REFERENCES flottes(id) ON DELETE CASCADE;
  END IF;
  -- subscription_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'jetons_qr' AND column_name = 'subscription_id'
  ) THEN
    ALTER TABLE jetons_qr ADD COLUMN subscription_id uuid REFERENCES abonnements(id) ON DELETE SET NULL;
  END IF;
  -- license_ids
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'jetons_qr' AND column_name = 'license_ids'
  ) THEN
    ALTER TABLE jetons_qr ADD COLUMN license_ids uuid[];
  END IF;
  -- action
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'jetons_qr' AND column_name = 'action'
  ) THEN
    ALTER TABLE jetons_qr ADD COLUMN action text NOT NULL DEFAULT 'activate';
  END IF;
  -- max_uses
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'jetons_qr' AND column_name = 'max_uses'
  ) THEN
    ALTER TABLE jetons_qr ADD COLUMN max_uses int NOT NULL DEFAULT 1;
  END IF;
  -- used_count
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'jetons_qr' AND column_name = 'used_count'
  ) THEN
    ALTER TABLE jetons_qr ADD COLUMN used_count int NOT NULL DEFAULT 0;
  END IF;
  -- vehicle_id nullable pour QR type "lot"
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'jetons_qr' AND column_name = 'vehicle_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE jetons_qr ALTER COLUMN vehicle_id DROP NOT NULL;
  END IF;
END $$;

-- 0) Tables addons / abonnements_addons si absentes
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

-- 0) Table journal_scans_qr si absente
CREATE TABLE IF NOT EXISTS journal_scans_qr (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_token_id uuid NOT NULL REFERENCES jetons_qr(id) ON DELETE CASCADE,
  scanned_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scanned_by_role role_type,
  scanned_at timestamptz NOT NULL DEFAULT now(),
  result text NOT NULL,
  details jsonb
);
CREATE INDEX IF NOT EXISTS idx_journal_scans_qr_token ON journal_scans_qr(qr_token_id);
CREATE INDEX IF NOT EXISTS idx_journal_scans_qr_user ON journal_scans_qr(scanned_by_user_id);

-- 1) Utilisateurs de test (auth.users)
-- Tous les utilisateurs de test sont insérés avec le mot de passe Demo2025! (voir DEMO-CREDENTIALS.md).
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
SELECT
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  'demo.organizer@esamba.test',
  crypt('Demo2025!', gen_salt('bf')),
  now(),
  now(),
  '',
  '',
  '',
  ''
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'demo.organizer@esamba.test');
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
SELECT
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  'demo.manager1@esamba.test',
  crypt('Demo2025!', gen_salt('bf')),
  now(),
  now(),
  '',
  '',
  '',
  ''
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'demo.manager1@esamba.test');
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
SELECT
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  'demo.manager2@esamba.test',
  crypt('Demo2025!', gen_salt('bf')),
  now(),
  now(),
  '',
  '',
  '',
  ''
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'demo.manager2@esamba.test');
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
SELECT
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  'demo.driver1@esamba.test',
  crypt('Demo2025!', gen_salt('bf')),
  now(),
  now(),
  '',
  '',
  '',
  ''
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'demo.driver1@esamba.test');
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
SELECT
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  'demo.driver2@esamba.test',
  crypt('Demo2025!', gen_salt('bf')),
  now(),
  now(),
  '',
  '',
  '',
  ''
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'demo.driver2@esamba.test');
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
SELECT
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  'demo.mechanic1@esamba.test',
  crypt('Demo2025!', gen_salt('bf')),
  now(),
  now(),
  '',
  '',
  '',
  ''
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'demo.mechanic1@esamba.test');

-- Mise à jour mot de passe des comptes qui auraient été créés sans mot de passe
UPDATE auth.users
SET encrypted_password = crypt('Demo2025!', gen_salt('bf'))
WHERE email LIKE '%@esamba.test'
  AND (encrypted_password = '' OR encrypted_password IS NULL);

-- 2) Récupération des IDs utilisateurs
WITH u AS (
  SELECT email, id
  FROM auth.users
  WHERE email IN (
    'demo.organizer@esamba.test',
    'demo.manager1@esamba.test',
    'demo.manager2@esamba.test',
    'demo.driver1@esamba.test',
    'demo.driver2@esamba.test',
    'demo.mechanic1@esamba.test'
  )
)
SELECT * FROM u;

-- Le reste du script se déroule dans un bloc DO. (variables et séquences d'exemples)
DO $$
DECLARE
  v_org_id uuid;
  v_flotte_starter_id uuid;
  v_flotte_pro_id uuid;
  v_flotte_org_id uuid;
  v_user_organizer uuid;
  v_user_manager1 uuid;
  v_user_manager2 uuid;
  v_user_driver1 uuid;
  v_user_driver2 uuid;
  v_user_mechanic1 uuid;
  v_plan_starter_id uuid;
  v_plan_pro_id uuid;
  v_plan_org_id uuid;
  v_addon_pulse_plus_id uuid;
  v_addon_qr_premium_id uuid;
  v_abonnement_starter_id uuid;
  v_abonnement_pro_id uuid;
  v_abonnement_org_id uuid;
  v_vehicle1_id uuid;
  v_vehicle2_id uuid;
  v_vehicle3_id uuid;
  v_vehicle4_id uuid;
  v_vehicle5_id uuid;
  v_droit1_id uuid;
  v_droit2_id uuid;
  v_droit3_id uuid;
  v_droit4_id uuid;
  v_droit5_id uuid;
  v_qr_vehicle_id uuid;
  v_qr_lot_id uuid;
BEGIN
  -- Utilisateurs
  SELECT id INTO v_user_organizer FROM auth.users WHERE email = 'demo.organizer@esamba.test';
  SELECT id INTO v_user_manager1 FROM auth.users WHERE email = 'demo.manager1@esamba.test';
  SELECT id INTO v_user_manager2 FROM auth.users WHERE email = 'demo.manager2@esamba.test';
  SELECT id INTO v_user_driver1 FROM auth.users WHERE email = 'demo.driver1@esamba.test';
  SELECT id INTO v_user_driver2 FROM auth.users WHERE email = 'demo.driver2@esamba.test';
  SELECT id INTO v_user_mechanic1 FROM auth.users WHERE email = 'demo.mechanic1@esamba.test';

  -- Organisation DEMO
  INSERT INTO organisations (name, country_code)
  VALUES ('Organisation DEMO E-Samba', 'CM')
  ON CONFLICT (id) DO NOTHING
  RETURNING id INTO v_org_id;
  IF v_org_id IS NULL THEN
    SELECT id INTO v_org_id FROM organisations WHERE name = 'Organisation DEMO E-Samba' ORDER BY created_at ASC LIMIT 1;
  END IF;

  -- Flottes
  INSERT INTO flottes (org_id, name, collection_policy)
  VALUES (v_org_id, 'Flotte DEMO Starter', 'cash')
  ON CONFLICT DO NOTHING;
  INSERT INTO flottes (org_id, name, collection_policy)
  VALUES (v_org_id, 'Flotte DEMO Pro', 'mix')
  ON CONFLICT DO NOTHING;
  INSERT INTO flottes (org_id, name, collection_policy)
  VALUES (v_org_id, 'Flotte DEMO Organisateur', 'momo')
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_flotte_starter_id FROM flottes WHERE org_id = v_org_id AND name = 'Flotte DEMO Starter';
  SELECT id INTO v_flotte_pro_id FROM flottes WHERE org_id = v_org_id AND name = 'Flotte DEMO Pro';
  SELECT id INTO v_flotte_org_id FROM flottes WHERE org_id = v_org_id AND name = 'Flotte DEMO Organisateur';

  -- Profils
  INSERT INTO profils (user_id, full_name, phone)
  VALUES (v_user_organizer, 'Demo Organizer', '+237600000001')
  ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO profils (user_id, full_name, phone)
  VALUES (v_user_manager1, 'Demo Manager 1', '+237600000002')
  ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO profils (user_id, full_name, phone)
  VALUES (v_user_manager2, 'Demo Manager 2', '+237600000003')
  ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO profils (user_id, full_name, phone)
  VALUES (v_user_driver1, 'Demo Driver 1', '+237600000004')
  ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO profils (user_id, full_name, phone)
  VALUES (v_user_driver2, 'Demo Driver 2', '+237600000005')
  ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO profils (user_id, full_name, phone)
  VALUES (v_user_mechanic1, 'Demo Mechanic 1', '+237600000006')
  ON CONFLICT (user_id) DO NOTHING;

  -- Adhésions aux flottes (rôles)
  PERFORM public.creer_ou_mettre_a_jour_adhesion_flotte(v_flotte_starter_id, v_user_organizer, 'organizer', true);
  PERFORM public.creer_ou_mettre_a_jour_adhesion_flotte(v_flotte_pro_id, v_user_organizer, 'organizer', true);
  PERFORM public.creer_ou_mettre_a_jour_adhesion_flotte(v_flotte_org_id, v_user_organizer, 'organizer', true);
  PERFORM public.creer_ou_mettre_a_jour_adhesion_flotte(v_flotte_starter_id, v_user_manager1, 'manager', true);
  PERFORM public.creer_ou_mettre_a_jour_adhesion_flotte(v_flotte_pro_id, v_user_manager2, 'manager', true);
  PERFORM public.creer_ou_mettre_a_jour_adhesion_flotte(v_flotte_starter_id, v_user_driver1, 'driver', true);
  PERFORM public.creer_ou_mettre_a_jour_adhesion_flotte(v_flotte_pro_id, v_user_driver2, 'driver', true);
  PERFORM public.creer_ou_mettre_a_jour_adhesion_flotte(v_flotte_pro_id, v_user_mechanic1, 'mechanic', true);

  -- Plans
  INSERT INTO plans (code, name, price_per_vehicle, min_commitment_days, is_active)
  VALUES ('starter', 'Starter', 15000, 30, true)
  ON CONFLICT (code) DO NOTHING;
  INSERT INTO plans (code, name, price_per_vehicle, min_commitment_days, is_active)
  VALUES ('pro', 'Pro', 21000, 30, true)
  ON CONFLICT (code) DO NOTHING;
  INSERT INTO plans (code, name, price_per_vehicle, min_commitment_days, is_active)
  VALUES ('organizer', 'Organisateur', 0, 30, true)
  ON CONFLICT (code) DO NOTHING;
  SELECT id INTO v_plan_starter_id FROM plans WHERE code = 'starter';
  SELECT id INTO v_plan_pro_id FROM plans WHERE code = 'pro';
  SELECT id INTO v_plan_org_id FROM plans WHERE code = 'organizer';

  -- Addons (Pulse+ / QR Premium)
  INSERT INTO addons (code, name, price_per_vehicle, is_active)
  VALUES ('pulse_plus', 'IA Pulse+', 3000, true)
  ON CONFLICT (code) DO NOTHING;
  INSERT INTO addons (code, name, price_per_vehicle, is_active)
  VALUES ('qr_premium', 'QR Premium', 2000, true)
  ON CONFLICT (code) DO NOTHING;
  SELECT id INTO v_addon_pulse_plus_id FROM addons WHERE code = 'pulse_plus';
  SELECT id INTO v_addon_qr_premium_id FROM addons WHERE code = 'qr_premium';

  -- Véhicules (exemples par flotte)
  INSERT INTO vehicules (fleet_id, registration, brand, model, year, current_km)
  VALUES (v_flotte_starter_id, 'DEMO-START-001', 'Toyota', 'Corolla', 2015, 120000)
  ON CONFLICT (fleet_id, registration) DO NOTHING
  RETURNING id INTO v_vehicle1_id;
  IF v_vehicle1_id IS NULL THEN
    SELECT id INTO v_vehicle1_id FROM vehicules WHERE fleet_id = v_flotte_starter_id AND registration = 'DEMO-START-001';
  END IF;

  INSERT INTO vehicules (fleet_id, registration, brand, model, year, current_km)
  VALUES (v_flotte_starter_id, 'DEMO-START-002', 'Toyota', 'Yaris', 2016, 90000)
  ON CONFLICT (fleet_id, registration) DO NOTHING
  RETURNING id INTO v_vehicle2_id;
  IF v_vehicle2_id IS NULL THEN
    SELECT id INTO v_vehicle2_id FROM vehicules WHERE fleet_id = v_flotte_starter_id AND registration = 'DEMO-START-002';
  END IF;

  INSERT INTO vehicules (fleet_id, registration, brand, model, year, current_km)
  VALUES (v_flotte_pro_id, 'DEMO-PRO-001', 'Hyundai', 'Accent', 2018, 70000)
  ON CONFLICT (fleet_id, registration) DO NOTHING
  RETURNING id INTO v_vehicle3_id;
  IF v_vehicle3_id IS NULL THEN
    SELECT id INTO v_vehicle3_id FROM vehicules WHERE fleet_id = v_flotte_pro_id AND registration = 'DEMO-PRO-001';
  END IF;

  INSERT INTO vehicules (fleet_id, registration, brand, model, year, current_km)
  VALUES (v_flotte_pro_id, 'DEMO-PRO-002', 'Hyundai', 'i10', 2019, 50000)
  ON CONFLICT (fleet_id, registration) DO NOTHING
  RETURNING id INTO v_vehicle4_id;
  IF v_vehicle4_id IS NULL THEN
    SELECT id INTO v_vehicle4_id FROM vehicules WHERE fleet_id = v_flotte_pro_id AND registration = 'DEMO-PRO-002';
  END IF;

  INSERT INTO vehicules (fleet_id, registration, brand, model, year, current_km)
  VALUES (v_flotte_org_id, 'DEMO-ORG-001', 'Kia', 'Rio', 2017, 100000)
  ON CONFLICT (fleet_id, registration) DO NOTHING
  RETURNING id INTO v_vehicle5_id;
  IF v_vehicle5_id IS NULL THEN
    SELECT id INTO v_vehicle5_id FROM vehicules WHERE fleet_id = v_flotte_org_id AND registration = 'DEMO-ORG-001';
  END IF;

  -- Abonnements (par flotte)
  INSERT INTO abonnements (fleet_id, plan_id, starts_at, ends_at, status)
  VALUES (v_flotte_starter_id, v_plan_starter_id, now() - interval '10 days', now() + interval '20 days', 'active')
  RETURNING id INTO v_abonnement_starter_id;
  INSERT INTO abonnements (fleet_id, plan_id, starts_at, ends_at, status)
  VALUES (v_flotte_pro_id, v_plan_pro_id, now() - interval '5 days', now() + interval '25 days', 'active')
  RETURNING id INTO v_abonnement_pro_id;
  INSERT INTO abonnements (fleet_id, plan_id, starts_at, ends_at, status)
  VALUES (v_flotte_org_id, v_plan_org_id, now() - interval '30 days', now() + interval '335 days', 'active')
  RETURNING id INTO v_abonnement_org_id;

  -- Droits_vehicules (licences véhicule)
  INSERT INTO droits_vehicules (vehicle_id, subscription_id, active, starts_at, ends_at, status, is_premium)
  VALUES (v_vehicle1_id, v_abonnement_starter_id, true, now() - interval '10 days', now() + interval '20 days', 'active', false)
  RETURNING id INTO v_droit1_id;
  INSERT INTO droits_vehicules (vehicle_id, subscription_id, active, starts_at, ends_at, status, is_premium)
  VALUES (v_vehicle2_id, v_abonnement_starter_id, true, now() - interval '40 days', now() - interval '10 days', 'expired', false)
  RETURNING id INTO v_droit2_id;
  INSERT INTO droits_vehicules (vehicle_id, subscription_id, active, starts_at, ends_at, status, is_premium)
  VALUES (v_vehicle3_id, v_abonnement_pro_id, true, now() - interval '5 days', now() + interval '25 days', 'active', true)
  RETURNING id INTO v_droit3_id;
  INSERT INTO droits_vehicules (vehicle_id, subscription_id, active, starts_at, ends_at, status, is_premium)
  VALUES (v_vehicle4_id, v_abonnement_pro_id, true, now() - interval '5 days', now() + interval '25 days', 'active', true)
  RETURNING id INTO v_droit4_id;
  INSERT INTO droits_vehicules (vehicle_id, subscription_id, active, starts_at, ends_at, status, is_premium)
  VALUES (v_vehicle5_id, v_abonnement_org_id, true, now() - interval '30 days', now() + interval '335 days', 'active', false)
  RETURNING id INTO v_droit5_id;

  -- Abonnements_addons (Premium / Pulse+ sur flotte Pro)
  INSERT INTO abonnements_addons (subscription_id, addon_id, quantity)
  VALUES (v_abonnement_pro_id, v_addon_pulse_plus_id, 50)
  ON CONFLICT (subscription_id, addon_id) DO NOTHING;
  INSERT INTO abonnements_addons (subscription_id, addon_id, quantity)
  VALUES (v_abonnement_pro_id, v_addon_qr_premium_id, 50)
  ON CONFLICT (subscription_id, addon_id) DO NOTHING;

  -- Jetons QR (exemples : 1 véhicule, 1 lot)
  INSERT INTO jetons_qr (
    vehicle_id,
    token_hash,
    scope,
    expires_at,
    created_by,
    created_at,
    type,
    fleet_id,
    subscription_id,
    license_ids,
    action,
    max_uses,
    used_count
  )
  VALUES (
    v_vehicle3_id,
    encode(digest(gen_random_uuid()::text, 'sha256'), 'hex'),
    'subscription',
    now() + interval '7 days',
    v_user_manager2,
    now(),
    'vehicle',
    v_flotte_pro_id,
    v_abonnement_pro_id,
    ARRAY[v_droit3_id],
    'activate',
    1,
    0
  )
  RETURNING id INTO v_qr_vehicle_id;
  INSERT INTO jetons_qr (
    vehicle_id,
    token_hash,
    scope,
    expires_at,
    created_by,
    created_at,
    type,
    fleet_id,
    subscription_id,
    license_ids,
    action,
    max_uses,
    used_count
  )
  VALUES (
    v_vehicle3_id,
    encode(digest(gen_random_uuid()::text, 'sha256'), 'hex'),
    'subscription',
    now() + interval '7 days',
    v_user_manager2,
    now(),
    'lot',
    v_flotte_pro_id,
    v_abonnement_pro_id,
    ARRAY[v_droit3_id, v_droit4_id],
    'activate',
    10,
    0
  )
  RETURNING id INTO v_qr_lot_id;

  -- Journal_scans_qr exemples
  INSERT INTO journal_scans_qr (
    qr_token_id,
    scanned_by_user_id,
    scanned_by_role,
    result,
    details
  )
  VALUES (
    v_qr_vehicle_id,
    v_user_manager2,
    'manager',
    'success',
    jsonb_build_object('context', 'demo_vehicle_qr')
  );
  INSERT INTO journal_scans_qr (
    qr_token_id,
    scanned_by_user_id,
    scanned_by_role,
    result,
    details
  )
  VALUES (
    v_qr_lot_id,
    v_user_manager2,
    'manager',
    'success',
    jsonb_build_object('context', 'demo_lot_qr', 'vehicles', ARRAY[v_vehicle3_id, v_vehicle4_id])
  );
END $$;

COMMIT;

