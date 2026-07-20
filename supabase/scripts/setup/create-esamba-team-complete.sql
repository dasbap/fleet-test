-- =====================================================
-- CRÉATION COMPLÈTE D'UNE ÉQUIPE POUR LA FLOTTE ESAMBA
-- Smart Fleet Africa
-- =====================================================
-- Ce script crée des membres de test pour la Flotte ESAMBA
-- et vérifie que tout a été créé correctement
-- =====================================================

-- =====================================================
-- ÉTAPE 1 : Vérifier que la Flotte ESAMBA existe
-- =====================================================

DO $$
DECLARE
  v_fleet_id uuid;
  v_org_id uuid;
BEGIN
  -- Récupérer l'ID de l'organisation ESAMBA
  SELECT id INTO v_org_id
  FROM orgs
  WHERE name = 'Organisation ESAMBA'
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION '❌ Organisation ESAMBA non trouvée. Créez d''abord l''organisation.';
  END IF;

  -- Récupérer l'ID de la flotte ESAMBA
  SELECT id INTO v_fleet_id
  FROM fleets
  WHERE name = 'Flotte ESAMBA'
    AND org_id = v_org_id
  LIMIT 1;

  IF v_fleet_id IS NULL THEN
    RAISE EXCEPTION '❌ Flotte ESAMBA non trouvée. Créez d''abord la flotte.';
  END IF;

  RAISE NOTICE '✅ Flotte ESAMBA trouvée : %', v_fleet_id;
END $$;

-- =====================================================
-- ÉTAPE 2 : Vérifier les membres existants
-- =====================================================

DO $$
DECLARE
  v_fleet_id uuid;
  v_member_count integer;
BEGIN
  SELECT id INTO v_fleet_id
  FROM fleets
  WHERE name = 'Flotte ESAMBA'
  LIMIT 1;

  SELECT COUNT(*) INTO v_member_count
  FROM fleet_memberships
  WHERE fleet_id = v_fleet_id
    AND is_active = true;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'MEMBRES ACTUELS DE LA FLOTTE ESAMBA : %', v_member_count;
  RAISE NOTICE '========================================';
END $$;

-- =====================================================
-- ÉTAPE 3 : Créer des membres de test (si utilisateurs existent)
-- =====================================================
-- NOTE: Ce script utilise les emails des utilisateurs existants
-- Pour créer des membres, vous devez avoir des utilisateurs dans auth.users
-- =====================================================

DO $$
DECLARE
  v_fleet_id uuid;
  v_user_id uuid;
  v_membership_id uuid;
  v_user_email text;
  v_users_found integer := 0;
  v_members_created integer := 0;
BEGIN
  -- Récupérer l'ID de la flotte
  SELECT id INTO v_fleet_id
  FROM fleets
  WHERE name = 'Flotte ESAMBA'
  LIMIT 1;

  IF v_fleet_id IS NULL THEN
    RAISE EXCEPTION 'Flotte ESAMBA non trouvée';
  END IF;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'CRÉATION DES MEMBRES DE TEST';
  RAISE NOTICE '========================================';

  -- Exemple : Ajouter un manager (si l'utilisateur existe)
  -- Remplacez 'manager@example.com' par un email réel d'utilisateur
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'manager@example.com'
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    v_users_found := v_users_found + 1;
    SELECT public.upsert_fleet_membership(v_fleet_id, v_user_id, 'manager'::role_type, true) INTO v_membership_id;
    IF v_membership_id IS NOT NULL THEN
      v_members_created := v_members_created + 1;
      RAISE NOTICE '✅ Manager ajouté : manager@example.com';
    END IF;
  END IF;

  -- Exemple : Ajouter un chauffeur (si l'utilisateur existe)
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'driver@example.com'
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    v_users_found := v_users_found + 1;
    SELECT public.upsert_fleet_membership(v_fleet_id, v_user_id, 'driver'::role_type, true) INTO v_membership_id;
    IF v_membership_id IS NOT NULL THEN
      v_members_created := v_members_created + 1;
      RAISE NOTICE '✅ Chauffeur ajouté : driver@example.com';
    END IF;
  END IF;

  -- Exemple : Ajouter un mécanicien (si l'utilisateur existe)
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'mechanic@example.com'
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    v_users_found := v_users_found + 1;
    SELECT public.upsert_fleet_membership(v_fleet_id, v_user_id, 'mechanic'::role_type, true) INTO v_membership_id;
    IF v_membership_id IS NOT NULL THEN
      v_members_created := v_members_created + 1;
      RAISE NOTICE '✅ Mécanicien ajouté : mechanic@example.com';
    END IF;
  END IF;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Résumé :';
  RAISE NOTICE '  - Utilisateurs trouvés : %', v_users_found;
  RAISE NOTICE '  - Membres créés : %', v_members_created;
  RAISE NOTICE '========================================';
  RAISE NOTICE 'NOTE: Pour ajouter des membres réels, utilisez :';
  RAISE NOTICE '  1. L''interface Teams dans l''application';
  RAISE NOTICE '  2. La fonction RPC add_member_by_email avec des emails réels';
  RAISE NOTICE '========================================';
END $$;

-- =====================================================
-- ÉTAPE 4 : Vérification complète des membres
-- =====================================================

SELECT 
  'VÉRIFICATION DES MEMBRES' as etape,
  COUNT(*) as total_membres,
  COUNT(*) FILTER (WHERE fm.role = 'organizer') as organisateurs,
  COUNT(*) FILTER (WHERE fm.role = 'manager') as managers,
  COUNT(*) FILTER (WHERE fm.role = 'driver') as chauffeurs,
  COUNT(*) FILTER (WHERE fm.role = 'mechanic') as mecaniciens,
  COUNT(*) FILTER (WHERE fm.is_active = true) as membres_actifs,
  COUNT(*) FILTER (WHERE fm.is_active = false) as membres_inactifs
FROM fleet_memberships fm
JOIN fleets f ON f.id = fm.fleet_id
WHERE f.name = 'Flotte ESAMBA';

-- =====================================================
-- ÉTAPE 5 : Liste détaillée des membres
-- =====================================================

SELECT 
  'LISTE DÉTAILLÉE DES MEMBRES' as section,
  fm.id as membership_id,
  fm.role as role,
  CASE 
    WHEN fm.is_active THEN '✅ Actif'
    ELSE '❌ Inactif'
  END as statut,
  COALESCE(p.full_name, 'Non renseigné') as nom_complet,
  COALESCE(p.phone, 'Non renseigné') as telephone,
  COALESCE(u.email, 'Email non disponible') as email,
  TO_CHAR(fm.created_at, 'DD/MM/YYYY HH24:MI') as date_ajout
FROM fleet_memberships fm
JOIN fleets f ON f.id = fm.fleet_id
LEFT JOIN profiles p ON p.user_id = fm.user_id
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
-- ÉTAPE 6 : Vérification des permissions RPC
-- =====================================================

SELECT 
  'VÉRIFICATION DES FONCTIONS RPC' as section,
  proname as fonction,
  CASE 
    WHEN proname = 'ajouter_membre_par_email' THEN '✅ Disponible'
    WHEN proname = 'creer_ou_mettre_a_jour_adhesion_flotte' THEN '✅ Disponible'
    ELSE '❓ Autre fonction'
  END as statut
FROM pg_proc
WHERE proname IN ('ajouter_membre_par_email', 'creer_ou_mettre_a_jour_adhesion_flotte')
ORDER BY proname;

-- =====================================================
-- RÉSUMÉ FINAL
-- =====================================================

DO $$
DECLARE
  v_fleet_id uuid;
  v_total_members integer;
  v_active_members integer;
BEGIN
  SELECT id INTO v_fleet_id
  FROM fleets
  WHERE name = 'Flotte ESAMBA'
  LIMIT 1;

  SELECT COUNT(*) INTO v_total_members
  FROM fleet_memberships
  WHERE fleet_id = v_fleet_id;

  SELECT COUNT(*) INTO v_active_members
  FROM fleet_memberships
  WHERE fleet_id = v_fleet_id
    AND is_active = true;

  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ SCRIPT TERMINÉ AVEC SUCCÈS';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Flotte ESAMBA : %', v_fleet_id;
  RAISE NOTICE 'Total membres : %', v_total_members;
  RAISE NOTICE 'Membres actifs : %', v_active_members;
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Pour ajouter des membres :';
  RAISE NOTICE '  1. Allez sur /dashboard/teams dans l''application';
  RAISE NOTICE '  2. Cliquez sur "Ajouter un membre"';
  RAISE NOTICE '  3. Entrez l''email et sélectionnez le rôle';
  RAISE NOTICE '========================================';
END $$;
