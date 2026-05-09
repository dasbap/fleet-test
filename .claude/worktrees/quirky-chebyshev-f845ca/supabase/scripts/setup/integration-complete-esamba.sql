-- =====================================================
-- INTÉGRATION COMPLÈTE ESAMBA
-- Smart Fleet Africa - E-Samba
-- =====================================================
-- Ce script intègre tous les profils, équipes et véhicules
-- liés à l'organisation ESAMBA et teste que tout fonctionne
-- =====================================================
-- Exécutez ce script dans Supabase SQL Editor
-- =====================================================

BEGIN;

-- =====================================================
-- FONCTION HELPER : upsert_fleet_membership corrigée
-- =====================================================
-- Cette fonction utilise la table flotte_adhesions (nom français)
-- au lieu de fleet_memberships (nom anglais)
-- =====================================================

CREATE OR REPLACE FUNCTION public.upsert_fleet_membership_fr(
  p_fleet_id uuid,
  p_user_id uuid,
  p_role role_type,
  p_is_active boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_membership_id uuid;
BEGIN
  -- Insertion avec gestion automatique du conflit
  INSERT INTO flotte_adhesions (fleet_id, user_id, role, is_active)
  VALUES (p_fleet_id, p_user_id, p_role, p_is_active)
  ON CONFLICT (fleet_id, user_id, role)
  DO UPDATE SET
    is_active = p_is_active,
    created_at = CASE 
      WHEN flotte_adhesions.is_active = false AND p_is_active = true 
      THEN now() 
      ELSE flotte_adhesions.created_at 
    END
  RETURNING id INTO v_membership_id;
  
  RETURN v_membership_id;
END;
$$;

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
    RAISE EXCEPTION 'Organisation ESAMBA non trouvée. Exécutez d''abord l''étape 1.';
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
    RAISE EXCEPTION 'Flotte ESAMBA non trouvée. Exécutez d''abord l''étape 2.';
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
-- ÉTAPE 4 : Créer des profils pour tous les utilisateurs
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

  -- Parcourir tous les utilisateurs existants et créer leurs profils
  FOR v_user_id IN 
    SELECT id FROM auth.users
    ORDER BY created_at DESC
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
          INITCAP(REPLACE(SPLIT_PART((SELECT email FROM auth.users WHERE id = v_user_id), '@', 1), '.', ' '))
        ),
        NULL
      ON CONFLICT (user_id) DO NOTHING;
      
      v_users_processed := v_users_processed + 1;
      RAISE NOTICE '✅ Profil créé pour utilisateur : %', (SELECT email FROM auth.users WHERE id = v_user_id);
    END IF;
  END LOOP;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Profils traités : %', v_users_processed;
  RAISE NOTICE '========================================';
END $$;

-- =====================================================
-- ÉTAPE 5 : Assigner les membres à la flotte avec différents rôles
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
  v_user_count integer;
BEGIN
  -- Récupérer l'ID de la flotte
  SELECT id INTO v_fleet_id
  FROM flottes
  WHERE name = 'Flotte ESAMBA'
  LIMIT 1;

  IF v_fleet_id IS NULL THEN
    RAISE EXCEPTION 'Flotte ESAMBA non trouvée. Exécutez d''abord l''étape 2.';
  END IF;

  -- Compter les utilisateurs disponibles
  SELECT COUNT(*) INTO v_user_count FROM auth.users;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'ASSIGNATION DES MEMBRES À LA FLOTTE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Utilisateurs disponibles : %', v_user_count;

  -- Parcourir les utilisateurs et leur assigner des rôles
  FOR v_user_id, v_user_email IN 
    SELECT id, email 
    FROM auth.users
    ORDER BY created_at DESC
  LOOP
    -- Sélectionner le rôle selon l'index (cyclique)
    v_role := v_role_names[1 + (v_role_index % array_length(v_role_names, 1))]::role_type;
    v_role_index := v_role_index + 1;

    -- Utiliser upsert_fleet_membership_fr pour créer ou mettre à jour le membership
    -- Cette fonction utilise la table flotte_adhesions (nom français)
    BEGIN
      PERFORM public.upsert_fleet_membership_fr(
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

-- =====================================================
-- ÉTAPE 6 : Créer l'invitation ESAMBA-2024
-- =====================================================

DO $$
DECLARE
  v_fleet_id uuid;
  v_invitation_exists boolean;
BEGIN
  -- Récupérer l'ID de la flotte
  SELECT id INTO v_fleet_id
  FROM flottes
  WHERE name = 'Flotte ESAMBA'
  LIMIT 1;

  IF v_fleet_id IS NULL THEN
    RAISE EXCEPTION 'Flotte ESAMBA non trouvée. Exécutez d''abord l''étape 2.';
  END IF;

  -- Vérifier si l'invitation existe déjà
  SELECT EXISTS(
    SELECT 1 FROM flotte_invitations
    WHERE fleet_id = v_fleet_id
      AND code = 'ESAMBA-2024'
  ) INTO v_invitation_exists;

  IF NOT v_invitation_exists THEN
    -- Créer l'invitation
    INSERT INTO flotte_invitations (fleet_id, code, expires_at, max_uses)
    VALUES (
      v_fleet_id,
      'ESAMBA-2024',
      NULL, -- Pas d'expiration
      NULL  -- Pas de limite d'utilisation
    )
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE '✅ Invitation ESAMBA-2024 créée';
  ELSE
    RAISE NOTICE 'ℹ️  Invitation ESAMBA-2024 existe déjà';
  END IF;
END $$;

COMMIT;

-- =====================================================
-- ÉTAPE 7 : RAPPORT COMPLET ET VÉRIFICATIONS
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
  fm.role::text as role,
  CASE 
    WHEN fm.role = 'organizer' THEN 'Organisateur'
    WHEN fm.role = 'manager' THEN 'Gestionnaire'
    WHEN fm.role = 'driver' THEN 'Chauffeur'
    WHEN fm.role = 'mechanic' THEN 'Mécanicien'
    ELSE fm.role::text
  END::text as role_fr,
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

-- Vérification de l'invitation
SELECT 
  'INVITATION' as section,
  fi.code,
  f.name as flotte,
  fi.expires_at,
  fi.max_uses,
  fi.current_uses,
  CASE 
    WHEN fi.expires_at IS NULL OR fi.expires_at > NOW() THEN '✅ Valide'
    ELSE '❌ Expirée'
  END as statut
FROM flotte_invitations fi
JOIN flottes f ON f.id = fi.fleet_id
WHERE fi.code = 'ESAMBA-2024';

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
  v_organizers_count integer;
  v_managers_count integer;
  v_drivers_count integer;
  v_mechanics_count integer;
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

  SELECT COUNT(*) FILTER (WHERE role = 'organizer' AND is_active = true) INTO v_organizers_count
  FROM flotte_adhesions
  WHERE fleet_id = v_fleet_id;

  SELECT COUNT(*) FILTER (WHERE role = 'manager' AND is_active = true) INTO v_managers_count
  FROM flotte_adhesions
  WHERE fleet_id = v_fleet_id;

  SELECT COUNT(*) FILTER (WHERE role = 'driver' AND is_active = true) INTO v_drivers_count
  FROM flotte_adhesions
  WHERE fleet_id = v_fleet_id;

  SELECT COUNT(*) FILTER (WHERE role = 'mechanic' AND is_active = true) INTO v_mechanics_count
  FROM flotte_adhesions
  WHERE fleet_id = v_fleet_id;

  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ INTÉGRATION COMPLÈTE TERMINÉE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Organisation ESAMBA : %', v_org_id;
  RAISE NOTICE 'Flotte ESAMBA : %', v_fleet_id;
  RAISE NOTICE 'Véhicules : %', v_total_vehicles;
  RAISE NOTICE 'Membres totaux : %', v_total_members;
  RAISE NOTICE 'Membres actifs : %', v_active_members;
  RAISE NOTICE '  - Organisateurs : %', v_organizers_count;
  RAISE NOTICE '  - Gestionnaires : %', v_managers_count;
  RAISE NOTICE '  - Chauffeurs : %', v_drivers_count;
  RAISE NOTICE '  - Mécaniciens : %', v_mechanics_count;
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Pour tester dans l''application :';
  RAISE NOTICE '  1. Connectez-vous avec un compte organisateur';
  RAISE NOTICE '  2. Allez sur /dashboard/settings';
  RAISE NOTICE '  3. Vérifiez la section "Vérification des données"';
  RAISE NOTICE '  4. Vérifiez la section "Mon espace organisateur"';
  RAISE NOTICE '  5. Allez sur /dashboard/teams pour voir tous les membres';
  RAISE NOTICE '  6. Allez sur /dashboard/vehicles pour voir tous les véhicules';
  RAISE NOTICE '========================================';
END $$;
