-- =====================================================
-- SCRIPT COMPLET : CRÉATION ET VÉRIFICATION ESAMBA
-- Smart Fleet Africa - E-Samba
-- =====================================================
-- Ce script :
-- 1. Crée ou vérifie l'Organisation ESAMBA
-- 2. Crée ou vérifie la Flotte ESAMBA
-- 3. Crée plusieurs véhicules de test
-- 4. Crée des utilisateurs de test avec leurs profils
-- 5. Assigne les rôles (organizer, manager, driver, mechanic)
-- 6. Affiche un rapport complet
-- =====================================================
-- Exécutez ce script dans Supabase SQL Editor
-- =====================================================

BEGIN;

-- =====================================================
-- ÉTAPE 1 : Créer ou vérifier l'Organisation ESAMBA
-- =====================================================

DO $$
DECLARE
  v_org_id uuid;
BEGIN
  -- Vérifier si l'organisation existe déjà
  SELECT id INTO v_org_id
  FROM organisations
  WHERE name = 'Organisation ESAMBA'
  LIMIT 1;

  IF v_org_id IS NULL THEN
    -- Créer l'organisation
    INSERT INTO organisations (name, country_code)
    VALUES ('Organisation ESAMBA', 'CM')
    RETURNING id INTO v_org_id;
    RAISE NOTICE '✅ Organisation ESAMBA créée : %', v_org_id;
  ELSE
    RAISE NOTICE 'ℹ️  Organisation ESAMBA existe déjà : %', v_org_id;
  END IF;
END $$;

-- =====================================================
-- ÉTAPE 2 : Créer ou vérifier la Flotte ESAMBA
-- =====================================================

DO $$
DECLARE
  v_org_id uuid;
  v_fleet_id uuid;
BEGIN
  -- Récupérer l'ID de l'organisation
  SELECT id INTO v_org_id
  FROM organisations
  WHERE name = 'Organisation ESAMBA'
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Organisation ESAMBA non trouvée';
  END IF;

  -- Vérifier si la flotte existe déjà
  SELECT id INTO v_fleet_id
  FROM flottes
  WHERE org_id = v_org_id
    AND name = 'Flotte ESAMBA'
  LIMIT 1;

  IF v_fleet_id IS NULL THEN
    -- Créer la flotte
    INSERT INTO flottes (org_id, name, collection_policy)
    VALUES (v_org_id, 'Flotte ESAMBA', 'mix')
    RETURNING id INTO v_fleet_id;
    RAISE NOTICE '✅ Flotte ESAMBA créée : %', v_fleet_id;
  ELSE
    RAISE NOTICE 'ℹ️  Flotte ESAMBA existe déjà : %', v_fleet_id;
  END IF;
END $$;

-- =====================================================
-- ÉTAPE 3 : Créer ou vérifier les véhicules
-- =====================================================

DO $$
DECLARE
  v_fleet_id uuid;
  v_vehicle_id uuid;
  v_vehicles_created integer := 0;
  v_vehicles_existing integer := 0;
BEGIN
  -- Récupérer l'ID de la flotte
  SELECT id INTO v_fleet_id
  FROM flottes
  WHERE name = 'Flotte ESAMBA'
  LIMIT 1;

  IF v_fleet_id IS NULL THEN
    RAISE EXCEPTION 'Flotte ESAMBA non trouvée';
  END IF;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'CRÉATION DES VÉHICULES';
  RAISE NOTICE '========================================';

  -- Véhicule 1 : ESAMBA-001
  SELECT id INTO v_vehicle_id
  FROM vehicules
  WHERE fleet_id = v_fleet_id
    AND registration = 'ESAMBA-001'
  LIMIT 1;

  IF v_vehicle_id IS NULL THEN
    INSERT INTO vehicules (
      fleet_id,
      registration,
      brand,
      model,
      year,
      current_km,
      status
    )
    VALUES (
      v_fleet_id,
      'ESAMBA-001',
      'Toyota',
      'Corolla',
      2020,
      15000,
      'ok'
    )
    RETURNING id INTO v_vehicle_id;
    v_vehicles_created := v_vehicles_created + 1;
    RAISE NOTICE '✅ Véhicule ESAMBA-001 créé';
  ELSE
    v_vehicles_existing := v_vehicles_existing + 1;
    RAISE NOTICE 'ℹ️  Véhicule ESAMBA-001 existe déjà';
  END IF;

  -- Véhicule 2 : ESAMBA-002
  SELECT id INTO v_vehicle_id
  FROM vehicules
  WHERE fleet_id = v_fleet_id
    AND registration = 'ESAMBA-002'
  LIMIT 1;

  IF v_vehicle_id IS NULL THEN
    INSERT INTO vehicules (
      fleet_id,
      registration,
      brand,
      model,
      year,
      current_km,
      status
    )
    VALUES (
      v_fleet_id,
      'ESAMBA-002',
      'Honda',
      'Civic',
      2021,
      12000,
      'ok'
    )
    RETURNING id INTO v_vehicle_id;
    v_vehicles_created := v_vehicles_created + 1;
    RAISE NOTICE '✅ Véhicule ESAMBA-002 créé';
  ELSE
    v_vehicles_existing := v_vehicles_existing + 1;
    RAISE NOTICE 'ℹ️  Véhicule ESAMBA-002 existe déjà';
  END IF;

  -- Véhicule 3 : ESAMBA-003
  SELECT id INTO v_vehicle_id
  FROM vehicules
  WHERE fleet_id = v_fleet_id
    AND registration = 'ESAMBA-003'
  LIMIT 1;

  IF v_vehicle_id IS NULL THEN
    INSERT INTO vehicules (
      fleet_id,
      registration,
      brand,
      model,
      year,
      current_km,
      status
    )
    VALUES (
      v_fleet_id,
      'ESAMBA-003',
      'Nissan',
      'Sentra',
      2019,
      25000,
      'ok'
    )
    RETURNING id INTO v_vehicle_id;
    v_vehicles_created := v_vehicles_created + 1;
    RAISE NOTICE '✅ Véhicule ESAMBA-003 créé';
  ELSE
    v_vehicles_existing := v_vehicles_existing + 1;
    RAISE NOTICE 'ℹ️  Véhicule ESAMBA-003 existe déjà';
  END IF;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Véhicules créés : %', v_vehicles_created;
  RAISE NOTICE 'Véhicules existants : %', v_vehicles_existing;
  RAISE NOTICE '========================================';
END $$;

-- =====================================================
-- ÉTAPE 4 : Créer des utilisateurs de test et leurs profils
-- =====================================================
-- NOTE: Cette étape nécessite que les utilisateurs existent dans auth.users
-- Pour créer des utilisateurs, utilisez l'interface d'authentification
-- ou créez-les manuellement dans Supabase Auth
-- =====================================================

DO $$
DECLARE
  v_user_id uuid;
  v_profile_exists boolean;
  v_users_processed integer := 0;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CRÉATION DES PROFILS UTILISATEURS';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'NOTE: Les utilisateurs doivent exister dans auth.users';
  RAISE NOTICE '      avant de créer leurs profils.';
  RAISE NOTICE '========================================';

  -- Parcourir tous les utilisateurs existants et créer leurs profils
  FOR v_user_id IN 
    SELECT id FROM auth.users
    ORDER BY created_at DESC
    LIMIT 10
  LOOP
    -- Vérifier si le profil existe déjà
    SELECT EXISTS(
      SELECT 1 FROM profils WHERE user_id = v_user_id
    ) INTO v_profile_exists;

    IF NOT v_profile_exists THEN
      -- Créer le profil avec un nom basé sur l'email
      INSERT INTO profils (user_id, full_name, phone)
      SELECT 
        v_user_id,
        COALESCE(
          (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = v_user_id),
          SPLIT_PART((SELECT email FROM auth.users WHERE id = v_user_id), '@', 1)
        ),
        NULL
      ON CONFLICT (user_id) DO NOTHING;
      
      v_users_processed := v_users_processed + 1;
      RAISE NOTICE '✅ Profil créé pour utilisateur : %', v_user_id;
    END IF;
  END LOOP;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Profils traités : %', v_users_processed;
  RAISE NOTICE '========================================';
END $$;

-- =====================================================
-- ÉTAPE 5 : Assigner les rôles aux utilisateurs existants
-- =====================================================
-- Cette étape assigne automatiquement des rôles aux utilisateurs
-- en fonction de leur ordre d'apparition
-- =====================================================

DO $$
DECLARE
  v_fleet_id uuid;
  v_user_id uuid;
  v_user_email text;
  v_role role_type;
  v_role_names text[] := ARRAY['organizer', 'manager', 'driver', 'driver', 'mechanic'];
  v_role_index integer := 0;
  v_members_created integer := 0;
BEGIN
  -- Récupérer l'ID de la flotte
  SELECT id INTO v_fleet_id
  FROM flottes
  WHERE name = 'Flotte ESAMBA'
  LIMIT 1;

  IF v_fleet_id IS NULL THEN
    RAISE EXCEPTION 'Flotte ESAMBA non trouvée';
  END IF;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'ASSIGNATION DES RÔLES';
  RAISE NOTICE '========================================';

  -- Parcourir les utilisateurs et leur assigner des rôles
  FOR v_user_id, v_user_email IN 
    SELECT id, email 
    FROM auth.users
    ORDER BY created_at DESC
    LIMIT 5
  LOOP
    -- Sélectionner le rôle selon l'index
    v_role := v_role_names[1 + (v_role_index % array_length(v_role_names, 1))]::role_type;
    v_role_index := v_role_index + 1;

    -- Utiliser upsert_fleet_membership pour créer ou mettre à jour le membership
    BEGIN
      PERFORM public.upsert_fleet_membership(
        v_fleet_id,
        v_user_id,
        v_role,
        true
      );
      
      v_members_created := v_members_created + 1;
      RAISE NOTICE '✅ Rôle "%" assigné à : %', v_role, v_user_email;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE '⚠️  Erreur lors de l''assignation du rôle à % : %', v_user_email, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Membres créés : %', v_members_created;
  RAISE NOTICE '========================================';
END $$;

COMMIT;

-- =====================================================
-- ÉTAPE 6 : RAPPORT COMPLET
-- =====================================================

-- Statistiques de l'organisation
SELECT 
  'STATISTIQUES ORGANISATION' as section,
  o.name as organisation,
  COUNT(DISTINCT f.id) as nombre_flottes,
  COUNT(DISTINCT v.id) as nombre_vehicules,
  COUNT(DISTINCT fm.user_id) as nombre_membres
FROM organisations o
LEFT JOIN flottes f ON f.org_id = o.id
LEFT JOIN vehicules v ON v.fleet_id = f.id
LEFT JOIN flotte_adhesions fm ON fm.fleet_id = f.id AND fm.is_active = true
WHERE o.name = 'Organisation ESAMBA'
GROUP BY o.id, o.name;

-- Statistiques de la flotte
SELECT 
  'STATISTIQUES FLOTTE' as section,
  f.name as flotte,
  COUNT(DISTINCT v.id) as nombre_vehicules,
  COUNT(DISTINCT fm.id) FILTER (WHERE fm.role = 'organizer') as organisateurs,
  COUNT(DISTINCT fm.id) FILTER (WHERE fm.role = 'manager') as managers,
  COUNT(DISTINCT fm.id) FILTER (WHERE fm.role = 'driver') as chauffeurs,
  COUNT(DISTINCT fm.id) FILTER (WHERE fm.role = 'mechanic') as mecaniciens,
  COUNT(DISTINCT fm.id) FILTER (WHERE fm.is_active = true) as membres_actifs
FROM flottes f
LEFT JOIN vehicules v ON v.fleet_id = f.id
LEFT JOIN flotte_adhesions fm ON fm.fleet_id = f.id
WHERE f.name = 'Flotte ESAMBA'
GROUP BY f.id, f.name;

-- Liste des véhicules
SELECT 
  'VÉHICULES' as section,
  v.registration,
  v.brand,
  v.model,
  v.year,
  v.current_km,
  CASE 
    WHEN v.status = 'ok' THEN '✅ OK'
    WHEN v.status = 'blocked' THEN '❌ Bloqué'
    ELSE v.status
  END as statut
FROM vehicules v
JOIN flottes f ON f.id = v.fleet_id
WHERE f.name = 'Flotte ESAMBA'
ORDER BY v.registration;

-- Liste détaillée des membres avec leurs rôles
SELECT 
  'MEMBRES ET RÔLES' as section,
  p.full_name as nom_complet,
  COALESCE(p.phone, 'Non renseigné') as telephone,
  u.email,
  fm.role as role,
  CASE 
    WHEN fm.role = 'organizer' THEN 'Organisateur'
    WHEN fm.role = 'manager' THEN 'Gestionnaire'
    WHEN fm.role = 'driver' THEN 'Chauffeur'
    WHEN fm.role = 'mechanic' THEN 'Mécanicien'
    ELSE fm.role
  END as role_fr,
  CASE 
    WHEN fm.is_active THEN '✅ Actif'
    ELSE '❌ Inactif'
  END as statut,
  TO_CHAR(fm.created_at, 'DD/MM/YYYY HH24:MI') as date_ajout
FROM flotte_adhesions fm
JOIN flottes f ON f.id = fm.fleet_id
LEFT JOIN profils p ON p.user_id = fm.user_id
LEFT JOIN auth.users u ON u.id = fm.user_id
WHERE f.name = 'Flotte ESAMBA'
ORDER BY 
  CASE fm.role
    WHEN 'organizer' THEN 1
    WHEN 'manager' THEN 2
    WHEN 'mechanic' THEN 3
    WHEN 'driver' THEN 4
  END,
  fm.created_at DESC;

-- =====================================================
-- RÉSUMÉ FINAL
-- =====================================================

DO $$
DECLARE
  v_org_id uuid;
  v_fleet_id uuid;
  v_total_vehicles integer;
  v_total_members integer;
  v_active_members integer;
BEGIN
  SELECT id INTO v_org_id
  FROM organisations
  WHERE name = 'Organisation ESAMBA'
  LIMIT 1;

  SELECT id INTO v_fleet_id
  FROM flottes
  WHERE name = 'Flotte ESAMBA'
  LIMIT 1;

  SELECT COUNT(*) INTO v_total_vehicles
  FROM vehicules
  WHERE fleet_id = v_fleet_id;

  SELECT COUNT(*) INTO v_total_members
  FROM flotte_adhesions
  WHERE fleet_id = v_fleet_id;

  SELECT COUNT(*) INTO v_active_members
  FROM flotte_adhesions
  WHERE fleet_id = v_fleet_id
    AND is_active = true;

  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ SCRIPT TERMINÉ AVEC SUCCÈS';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Organisation ESAMBA : %', v_org_id;
  RAISE NOTICE 'Flotte ESAMBA : %', v_fleet_id;
  RAISE NOTICE 'Véhicules : %', v_total_vehicles;
  RAISE NOTICE 'Membres totaux : %', v_total_members;
  RAISE NOTICE 'Membres actifs : %', v_active_members;
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Pour tester dans l''application :';
  RAISE NOTICE '  1. Connectez-vous avec un compte utilisateur';
  RAISE NOTICE '  2. Allez sur /dashboard/settings';
  RAISE NOTICE '  3. Vérifiez la section "Mon espace organisateur"';
  RAISE NOTICE '  4. Vous devriez voir tous les profils et leurs rôles';
  RAISE NOTICE '========================================';
END $$;
