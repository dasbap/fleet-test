-- =====================================================
-- JEU DE DONNÉES DÉMO : ORGANISATION E-SAMBA COMPLÈTE
-- Smart Fleet Africa
-- =====================================================
-- Crée (idempotent) :
-- - Plans : starter, pro, organizer (si absents)
-- - Addons catalogue : pulse_plus, qr_premium
-- - Organisation « Organisation DEMO E-Samba »
-- - 3 flottes : Starter, Pro, Organisateur
-- - 5 véhicules (immatriculations DEMO-*)
-- - Abonnements actifs + droits véhicules + addons sur abonnements
-- - Jetons QR démo (si utilisateur demo.organizer@esamba.test existe)
-- - Profils + adhésions flotte pour les emails @esamba.test déjà présents dans auth.users
--
-- Mots de passe : fournis uniquement via un environnement non versionné ; voir docs/DEMO-CREDENTIALS.md
-- Vérification : supabase/scripts/verify/verify-demo-organization.sql
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

BEGIN;

-- ---------------------------------------------------------------------------
-- Plans produit
-- ---------------------------------------------------------------------------
INSERT INTO public.plans (code, name, price_per_vehicle, min_commitment_days, is_active, max_vehicles, enables_finance, enables_ai, enables_reports, enables_driver_scoring, enables_anomaly_insights)
VALUES
  ('starter','Starter (démo)',5000,60,true,25,true,true,true,true,true),
  ('pro','Pro (démo)',10000,60,true,75,true,true,true,true,true),
  ('organizer','Organisateur (démo)',15000,60,true,999999,true,true,true,true,true)
ON CONFLICT (code) DO UPDATE SET
  name=EXCLUDED.name, price_per_vehicle=EXCLUDED.price_per_vehicle,
  min_commitment_days=EXCLUDED.min_commitment_days, is_active=EXCLUDED.is_active,
  max_vehicles=EXCLUDED.max_vehicles, enables_finance=EXCLUDED.enables_finance,
  enables_ai=EXCLUDED.enables_ai, enables_reports=EXCLUDED.enables_reports,
  enables_driver_scoring=EXCLUDED.enables_driver_scoring,
  enables_anomaly_insights=EXCLUDED.enables_anomaly_insights;

-- ---------------------------------------------------------------------------
-- Catalogue addons
-- ---------------------------------------------------------------------------
INSERT INTO public.addons (code, name, price_per_vehicle, is_active)
VALUES
  ('pulse_plus','Pulse+ (démo)',1000,true),
  ('qr_premium','QR Premium (démo)',2000,true)
ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name, price_per_vehicle=EXCLUDED.price_per_vehicle, is_active=EXCLUDED.is_active;

-- ---------------------------------------------------------------------------
-- Organisation + flottes
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_org_id uuid; v_fleet_starter uuid; v_fleet_pro uuid; v_fleet_org uuid;
BEGIN
  SELECT id INTO v_org_id FROM public.organisations WHERE name='Organisation DEMO E-Samba' ORDER BY created_at ASC LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO public.organisations (name, country_code, is_demo) VALUES ('Organisation DEMO E-Samba','CM', true) RETURNING id INTO v_org_id;
    RAISE NOTICE 'Organisation créée : %', v_org_id;
  ELSE RAISE NOTICE 'Organisation existante : %', v_org_id; END IF;

  SELECT id INTO v_fleet_starter FROM public.flottes WHERE org_id=v_org_id AND name='Flotte DEMO Starter' LIMIT 1;
  IF v_fleet_starter IS NULL THEN INSERT INTO public.flottes(org_id,name,collection_policy,is_demo) VALUES(v_org_id,'Flotte DEMO Starter','mix',true) RETURNING id INTO v_fleet_starter; END IF;

  SELECT id INTO v_fleet_pro FROM public.flottes WHERE org_id=v_org_id AND name='Flotte DEMO Pro' LIMIT 1;
  IF v_fleet_pro IS NULL THEN INSERT INTO public.flottes(org_id,name,collection_policy,is_demo) VALUES(v_org_id,'Flotte DEMO Pro','mix',true) RETURNING id INTO v_fleet_pro; END IF;

  SELECT id INTO v_fleet_org FROM public.flottes WHERE org_id=v_org_id AND name='Flotte DEMO Entreprise' LIMIT 1;
  IF v_fleet_org IS NULL THEN INSERT INTO public.flottes(org_id,name,collection_policy,is_demo) VALUES(v_org_id,'Flotte DEMO Entreprise','mix',true) RETURNING id INTO v_fleet_org; END IF;

  UPDATE public.organisations SET is_demo = true WHERE id = v_org_id AND COALESCE(is_demo, false) = false;
  UPDATE public.flottes SET is_demo = true WHERE org_id = v_org_id AND COALESCE(is_demo, false) = false;

  RAISE NOTICE 'Flottes : starter=%, pro=%, org=%', v_fleet_starter, v_fleet_pro, v_fleet_org;
END $$;

-- ---------------------------------------------------------------------------
-- Véhicules
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_org_id uuid; v_fleet_starter uuid; v_fleet_pro uuid; v_fleet_org uuid;
BEGIN
  SELECT id INTO v_org_id FROM public.organisations WHERE name='Organisation DEMO E-Samba' ORDER BY created_at ASC LIMIT 1;
  SELECT id INTO v_fleet_starter FROM public.flottes WHERE org_id=v_org_id AND name='Flotte DEMO Starter' LIMIT 1;
  SELECT id INTO v_fleet_pro FROM public.flottes WHERE org_id=v_org_id AND name='Flotte DEMO Pro' LIMIT 1;
  SELECT id INTO v_fleet_org FROM public.flottes WHERE org_id=v_org_id AND name='Flotte DEMO Organisateur' LIMIT 1;
  INSERT INTO public.vehicules (fleet_id,registration,brand,model,year,current_km,status) VALUES
    (v_fleet_starter,'DEMO-START-001','Toyota','Hiace',2021,42000,'ok'),
    (v_fleet_starter,'DEMO-START-002','Mercedes','Sprinter',2020,61000,'ok'),
    (v_fleet_pro,'DEMO-PRO-001','Isuzu','NPR',2022,18000,'ok'),
    (v_fleet_pro,'DEMO-PRO-002','Peugeot','Boxer',2019,77000,'ok'),
    (v_fleet_org,'DEMO-ORG-001','Ford','Transit',2023,9000,'ok')
  ON CONFLICT (fleet_id,registration) DO NOTHING;
END $$;

-- ---------------------------------------------------------------------------
-- Abonnements actifs (un par flotte)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_org_id uuid; v_fleet_starter uuid; v_fleet_pro uuid; v_fleet_org uuid;
  v_plan_starter uuid; v_plan_pro uuid; v_plan_org uuid;
  v_sub uuid; v_end timestamptz := now() + interval '400 days';
BEGIN
  SELECT id INTO v_org_id FROM public.organisations WHERE name='Organisation DEMO E-Samba' ORDER BY created_at ASC LIMIT 1;
  SELECT id INTO v_fleet_starter FROM public.flottes WHERE org_id=v_org_id AND name='Flotte DEMO Starter' LIMIT 1;
  SELECT id INTO v_fleet_pro FROM public.flottes WHERE org_id=v_org_id AND name='Flotte DEMO Pro' LIMIT 1;
  SELECT id INTO v_fleet_org FROM public.flottes WHERE org_id=v_org_id AND name='Flotte DEMO Organisateur' LIMIT 1;
  SELECT id INTO v_plan_starter FROM public.plans WHERE code='starter' LIMIT 1;
  SELECT id INTO v_plan_pro FROM public.plans WHERE code='pro' LIMIT 1;
  SELECT id INTO v_plan_org FROM public.plans WHERE code='organizer' LIMIT 1;

  SELECT a.id INTO v_sub FROM public.abonnements a JOIN public.plans p ON p.id=a.plan_id
    WHERE a.fleet_id=v_fleet_starter AND p.code='starter' AND a.status='active' ORDER BY a.starts_at DESC LIMIT 1;
  IF v_sub IS NULL THEN INSERT INTO public.abonnements(fleet_id,plan_id,payment_id,starts_at,ends_at,status) VALUES(v_fleet_starter,v_plan_starter,NULL,now(),v_end,'active'); END IF;

  SELECT a.id INTO v_sub FROM public.abonnements a JOIN public.plans p ON p.id=a.plan_id
    WHERE a.fleet_id=v_fleet_pro AND p.code='pro' AND a.status='active' ORDER BY a.starts_at DESC LIMIT 1;
  IF v_sub IS NULL THEN INSERT INTO public.abonnements(fleet_id,plan_id,payment_id,starts_at,ends_at,status) VALUES(v_fleet_pro,v_plan_pro,NULL,now(),v_end,'active'); END IF;

  SELECT a.id INTO v_sub FROM public.abonnements a JOIN public.plans p ON p.id=a.plan_id
    WHERE a.fleet_id=v_fleet_org AND p.code='organizer' AND a.status='active' ORDER BY a.starts_at DESC LIMIT 1;
  IF v_sub IS NULL THEN INSERT INTO public.abonnements(fleet_id,plan_id,payment_id,starts_at,ends_at,status) VALUES(v_fleet_org,v_plan_org,NULL,now(),v_end,'active'); END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Droits véhicules
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_org_id uuid; v_fleet_starter uuid; v_fleet_pro uuid; v_fleet_org uuid;
  v_sub uuid; v_vid uuid; v_end_license timestamptz := now() + interval '400 days';
BEGIN
  SELECT id INTO v_org_id FROM public.organisations WHERE name='Organisation DEMO E-Samba' ORDER BY created_at ASC LIMIT 1;
  SELECT id INTO v_fleet_starter FROM public.flottes WHERE org_id=v_org_id AND name='Flotte DEMO Starter' LIMIT 1;
  SELECT id INTO v_fleet_pro FROM public.flottes WHERE org_id=v_org_id AND name='Flotte DEMO Pro' LIMIT 1;
  SELECT id INTO v_fleet_org FROM public.flottes WHERE org_id=v_org_id AND name='Flotte DEMO Organisateur' LIMIT 1;

  SELECT a.id INTO v_sub FROM public.abonnements a JOIN public.plans p ON p.id=a.plan_id WHERE a.fleet_id=v_fleet_starter AND p.code='starter' AND a.status='active' ORDER BY a.starts_at DESC LIMIT 1;
  FOR v_vid IN SELECT v.id FROM public.vehicules v WHERE v.fleet_id=v_fleet_starter LOOP
    INSERT INTO public.droits_vehicules(vehicle_id,subscription_id,active,starts_at,ends_at,status,is_premium) VALUES(v_vid,v_sub,true,now(),v_end_license,'active',false) ON CONFLICT(vehicle_id,subscription_id) DO NOTHING;
  END LOOP;

  SELECT a.id INTO v_sub FROM public.abonnements a JOIN public.plans p ON p.id=a.plan_id WHERE a.fleet_id=v_fleet_pro AND p.code='pro' AND a.status='active' ORDER BY a.starts_at DESC LIMIT 1;
  FOR v_vid IN SELECT v.id FROM public.vehicules v WHERE v.fleet_id=v_fleet_pro LOOP
    INSERT INTO public.droits_vehicules(vehicle_id,subscription_id,active,starts_at,ends_at,status,is_premium) VALUES(v_vid,v_sub,true,now(),v_end_license,'active',true) ON CONFLICT(vehicle_id,subscription_id) DO NOTHING;
  END LOOP;

  SELECT a.id INTO v_sub FROM public.abonnements a JOIN public.plans p ON p.id=a.plan_id WHERE a.fleet_id=v_fleet_org AND p.code='organizer' AND a.status='active' ORDER BY a.starts_at DESC LIMIT 1;
  SELECT v.id INTO v_vid FROM public.vehicules v WHERE v.fleet_id=v_fleet_org LIMIT 1;
  IF v_vid IS NOT NULL AND v_sub IS NOT NULL THEN
    INSERT INTO public.droits_vehicules(vehicle_id,subscription_id,active,starts_at,ends_at,status,is_premium) VALUES(v_vid,v_sub,true,now(),v_end_license,'active',false) ON CONFLICT(vehicle_id,subscription_id) DO NOTHING;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Addons rattachés aux abonnements
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_org_id uuid; v_fleet_starter uuid; v_fleet_pro uuid;
  v_addon_pulse uuid; v_addon_qr uuid; v_sub uuid;
BEGIN
  SELECT id INTO v_org_id FROM public.organisations WHERE name='Organisation DEMO E-Samba' ORDER BY created_at ASC LIMIT 1;
  SELECT id INTO v_fleet_starter FROM public.flottes WHERE org_id=v_org_id AND name='Flotte DEMO Starter' LIMIT 1;
  SELECT id INTO v_fleet_pro FROM public.flottes WHERE org_id=v_org_id AND name='Flotte DEMO Pro' LIMIT 1;
  SELECT id INTO v_addon_pulse FROM public.addons WHERE code='pulse_plus' LIMIT 1;
  SELECT id INTO v_addon_qr FROM public.addons WHERE code='qr_premium' LIMIT 1;

  SELECT a.id INTO v_sub FROM public.abonnements a JOIN public.plans p ON p.id=a.plan_id WHERE a.fleet_id=v_fleet_starter AND p.code='starter' AND a.status='active' ORDER BY a.starts_at DESC LIMIT 1;
  IF v_sub IS NOT NULL AND v_addon_pulse IS NOT NULL THEN
    INSERT INTO public.abonnements_addons(subscription_id,addon_id,quantity) VALUES(v_sub,v_addon_pulse,2) ON CONFLICT(subscription_id,addon_id) DO UPDATE SET quantity=EXCLUDED.quantity;
  END IF;

  SELECT a.id INTO v_sub FROM public.abonnements a JOIN public.plans p ON p.id=a.plan_id WHERE a.fleet_id=v_fleet_pro AND p.code='pro' AND a.status='active' ORDER BY a.starts_at DESC LIMIT 1;
  IF v_sub IS NOT NULL AND v_addon_qr IS NOT NULL THEN
    INSERT INTO public.abonnements_addons(subscription_id,addon_id,quantity) VALUES(v_sub,v_addon_qr,2) ON CONFLICT(subscription_id,addon_id) DO UPDATE SET quantity=EXCLUDED.quantity;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Profils + adhésions flotte pour les comptes @esamba.test existants
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_org_id uuid; v_fleet_starter uuid; v_fleet_pro uuid; v_fleet_org uuid;
BEGIN
  SELECT id INTO v_org_id FROM public.organisations WHERE name='Organisation DEMO E-Samba' ORDER BY created_at ASC LIMIT 1;
  SELECT id INTO v_fleet_starter FROM public.flottes WHERE org_id=v_org_id AND name='Flotte DEMO Starter' LIMIT 1;
  SELECT id INTO v_fleet_pro FROM public.flottes WHERE org_id=v_org_id AND name='Flotte DEMO Pro' LIMIT 1;
  SELECT id INTO v_fleet_org FROM public.flottes WHERE org_id=v_org_id AND name='Flotte DEMO Organisateur' LIMIT 1;

  INSERT INTO public.profils (user_id, full_name)
  SELECT u.id, CASE u.email
    WHEN 'demo.organizer@esamba.test' THEN 'Organisateur démo'
    WHEN 'demo.manager1@esamba.test'  THEN 'Manager démo 1'
    WHEN 'demo.manager2@esamba.test'  THEN 'Manager démo 2'
    WHEN 'demo.driver1@esamba.test'   THEN 'Conducteur démo 1'
    WHEN 'demo.driver2@esamba.test'   THEN 'Conducteur démo 2'
    WHEN 'demo.mechanic1@esamba.test' THEN 'Mécanicien démo 1'
    ELSE split_part(u.email,'@',1) END
  FROM auth.users u
  WHERE u.email IN ('demo.organizer@esamba.test','demo.manager1@esamba.test','demo.manager2@esamba.test','demo.driver1@esamba.test','demo.driver2@esamba.test','demo.mechanic1@esamba.test')
  ON CONFLICT (user_id) DO NOTHING;

  -- Organizer → 3 flottes
  INSERT INTO public.flotte_adhesions(fleet_id,user_id,role,is_active)
  SELECT f.id, u.id, 'organizer'::public.role_type, true FROM auth.users u
    CROSS JOIN (SELECT unnest(ARRAY[v_fleet_starter,v_fleet_pro,v_fleet_org]) AS id) f
  WHERE u.email='demo.organizer@esamba.test' ON CONFLICT (fleet_id, user_id) DO UPDATE SET is_active=true, role='organizer'::public.role_type;

  -- Manager1 → Starter
  INSERT INTO public.flotte_adhesions(fleet_id,user_id,role,is_active)
  SELECT v_fleet_starter, u.id, 'manager'::public.role_type, true FROM auth.users u WHERE u.email='demo.manager1@esamba.test' ON CONFLICT (fleet_id, user_id) DO UPDATE SET is_active=true, role='manager'::public.role_type;

  -- Manager2 → Pro
  INSERT INTO public.flotte_adhesions(fleet_id,user_id,role,is_active)
  SELECT v_fleet_pro, u.id, 'manager'::public.role_type, true FROM auth.users u WHERE u.email='demo.manager2@esamba.test' ON CONFLICT (fleet_id, user_id) DO UPDATE SET is_active=true, role='manager'::public.role_type;

  -- Driver1 → Starter
  INSERT INTO public.flotte_adhesions(fleet_id,user_id,role,is_active)
  SELECT v_fleet_starter, u.id, 'driver'::public.role_type, true FROM auth.users u WHERE u.email='demo.driver1@esamba.test' ON CONFLICT (fleet_id, user_id) DO UPDATE SET is_active=true, role='driver'::public.role_type;

  -- Driver2 → Pro
  INSERT INTO public.flotte_adhesions(fleet_id,user_id,role,is_active)
  SELECT v_fleet_pro, u.id, 'driver'::public.role_type, true FROM auth.users u WHERE u.email='demo.driver2@esamba.test' ON CONFLICT (fleet_id, user_id) DO UPDATE SET is_active=true, role='driver'::public.role_type;

  -- Mechanic1 → Entreprise
  INSERT INTO public.flotte_adhesions(fleet_id,user_id,role,is_active)
  SELECT v_fleet_org, u.id, 'mechanic'::public.role_type, true FROM auth.users u WHERE u.email='demo.mechanic1@esamba.test' ON CONFLICT (fleet_id, user_id) DO UPDATE SET is_active=true, role='mechanic'::public.role_type;

  RAISE NOTICE 'Adhésions démo configurées.';
END $$;

COMMIT;
DO $$ BEGIN RAISE NOTICE 'Terminé. Vérifier avec : supabase/scripts/verify/verify-demo-organization.sql'; END $$;
