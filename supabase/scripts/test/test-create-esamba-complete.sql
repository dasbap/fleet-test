-- =====================================================
-- TEST COMPLET : CRÉATION ET VÉRIFICATION DES DONNÉES ESAMBA
-- Smart Fleet Africa
-- =====================================================
-- Ce script :
-- 1. Crée toutes les données ESAMBA si elles n'existent pas
-- 2. Vérifie que tout est créé correctement
-- 3. Affiche le statut final
-- =====================================================
-- Exécutez ce script dans Supabase SQL Editor
-- NOTE: Ce script fonctionne sans authentification utilisateur
-- =====================================================

-- =====================================================
-- ÉTAPE 1 : Créer ou récupérer l'organisation
-- =====================================================

DO $$
DECLARE
  v_org_id uuid;
BEGIN
  SELECT id INTO v_org_id
  FROM orgs
  WHERE name = 'Organisation ESAMBA'
  LIMIT 1;

  IF v_org_id IS NULL THEN
    INSERT INTO orgs (name, country_code)
    VALUES ('Organisation ESAMBA', 'CM')
    RETURNING id INTO v_org_id;
    RAISE NOTICE '✅ Organisation ESAMBA créée : %', v_org_id;
  ELSE
    RAISE NOTICE 'ℹ️  Organisation ESAMBA existe déjà : %', v_org_id;
  END IF;
END $$;

-- =====================================================
-- ÉTAPE 2 : Créer ou récupérer la flotte
-- =====================================================

DO $$
DECLARE
  v_org_id uuid;
  v_fleet_id uuid;
BEGIN
  -- Récupérer l'ID de l'organisation
  SELECT id INTO v_org_id
  FROM orgs
  WHERE name = 'Organisation ESAMBA'
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Organisation ESAMBA non trouvée. Exécutez d''abord l''étape 1.';
  END IF;

  -- Vérifier si la flotte existe déjà
  SELECT id INTO v_fleet_id
  FROM fleets
  WHERE org_id = v_org_id
    AND name = 'Flotte ESAMBA'
  LIMIT 1;

  IF v_fleet_id IS NULL THEN
    INSERT INTO fleets (org_id, name, collection_policy)
    VALUES (v_org_id, 'Flotte ESAMBA', 'mix')
    RETURNING id INTO v_fleet_id;
    RAISE NOTICE '✅ Flotte ESAMBA créée : %', v_fleet_id;
  ELSE
    RAISE NOTICE 'ℹ️  Flotte ESAMBA existe déjà : %', v_fleet_id;
  END IF;
END $$;

-- =====================================================
-- ÉTAPE 3 : Créer ou récupérer le véhicule
-- =====================================================

DO $$
DECLARE
  v_fleet_id uuid;
  v_vehicle_id uuid;
BEGIN
  -- Récupérer l'ID de la flotte
  SELECT id INTO v_fleet_id
  FROM fleets
  WHERE name = 'Flotte ESAMBA'
  LIMIT 1;

  IF v_fleet_id IS NULL THEN
    RAISE EXCEPTION 'Flotte ESAMBA non trouvée. Exécutez d''abord les étapes précédentes.';
  END IF;

  -- Vérifier si le véhicule existe déjà
  SELECT id INTO v_vehicle_id
  FROM vehicles
  WHERE fleet_id = v_fleet_id
    AND registration = 'ESAMBA-001'
  LIMIT 1;

  IF v_vehicle_id IS NULL THEN
    INSERT INTO vehicles (
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
      0,
      'ok'
    )
    RETURNING id INTO v_vehicle_id;
    RAISE NOTICE '✅ Véhicule ESAMBA-001 créé : %', v_vehicle_id;
  ELSE
    RAISE NOTICE 'ℹ️  Véhicule ESAMBA-001 existe déjà : %', v_vehicle_id;
  END IF;
END $$;

-- =====================================================
-- ÉTAPE 4 : Créer ou récupérer l'invitation
-- =====================================================

DO $$
DECLARE
  v_fleet_id uuid;
  v_invitation_code text;
BEGIN
  -- Récupérer l'ID de la flotte
  SELECT id INTO v_fleet_id
  FROM fleets
  WHERE name = 'Flotte ESAMBA'
  LIMIT 1;

  IF v_fleet_id IS NULL THEN
    RAISE EXCEPTION 'Flotte ESAMBA non trouvée. Exécutez d''abord les étapes précédentes.';
  END IF;

  -- Vérifier si l'invitation existe déjà
  SELECT code INTO v_invitation_code
  FROM fleet_invitations
  WHERE fleet_id = v_fleet_id
    AND code = 'ESAMBA-2024'
  LIMIT 1;

  IF v_invitation_code IS NULL THEN
    INSERT INTO fleet_invitations (
      fleet_id,
      code,
      current_uses
    )
    VALUES (
      v_fleet_id,
      'ESAMBA-2024',
      0
    )
    RETURNING code INTO v_invitation_code;
    RAISE NOTICE '✅ Invitation ESAMBA-2024 créée : %', v_invitation_code;
  ELSE
    RAISE NOTICE 'ℹ️  Invitation ESAMBA-2024 existe déjà : %', v_invitation_code;
  END IF;
END $$;

-- =====================================================
-- NOTE IMPORTANTE : Membership Organizer
-- =====================================================
-- Le membership organizer nécessite un utilisateur authentifié.
-- Il sera créé automatiquement lorsque vous utiliserez l'application
-- ou via la fonction RPC upsert_fleet_membership.
-- Pour créer manuellement, utilisez cette requête avec un user_id valide :
-- 
-- INSERT INTO fleet_memberships (fleet_id, user_id, role, is_active)
-- SELECT 
--   f.id,
--   'VOTRE_USER_ID_ICI'::uuid,
--   'organizer',
--   true
-- FROM fleets f
-- WHERE f.name = 'Flotte ESAMBA'
-- ON CONFLICT (fleet_id, user_id, role)
-- DO UPDATE SET is_active = true;
--
-- =====================================================

-- =====================================================
-- ÉTAPE 7 : Vérification finale (sans dépendre de auth.uid())
-- =====================================================

SELECT 
  'VÉRIFICATION FINALE' as etape,
  (SELECT COUNT(*) > 0 FROM orgs WHERE name = 'Organisation ESAMBA') as organisation,
  (SELECT COUNT(*) > 0 FROM fleets WHERE name = 'Flotte ESAMBA') as flotte,
  (SELECT COUNT(*) > 0 FROM fleet_memberships fm
   JOIN fleets f ON f.id = fm.fleet_id
   WHERE f.name = 'Flotte ESAMBA' 
     AND fm.role = 'organizer' 
     AND fm.is_active = true) as membership_organizer,
  (SELECT COUNT(*) > 0 FROM vehicles v
   JOIN fleets f ON f.id = v.fleet_id
   WHERE f.name = 'Flotte ESAMBA' 
     AND v.registration = 'ESAMBA-001') as vehicule_esamba_001,
  (SELECT COUNT(*) > 0 FROM fleet_invitations fi
   JOIN fleets f ON f.id = fi.fleet_id
   WHERE f.name = 'Flotte ESAMBA' 
     AND fi.code = 'ESAMBA-2024') as invitation_esamba_2024,
  CASE 
    WHEN (SELECT COUNT(*) > 0 FROM orgs WHERE name = 'Organisation ESAMBA')
     AND (SELECT COUNT(*) > 0 FROM fleets WHERE name = 'Flotte ESAMBA')
     AND (SELECT COUNT(*) > 0 FROM vehicles v
          JOIN fleets f ON f.id = v.fleet_id
          WHERE f.name = 'Flotte ESAMBA' 
            AND v.registration = 'ESAMBA-001')
     AND (SELECT COUNT(*) > 0 FROM fleet_invitations fi
          JOIN fleets f ON f.id = fi.fleet_id
          WHERE f.name = 'Flotte ESAMBA' 
            AND fi.code = 'ESAMBA-2024')
    THEN '✅ DONNÉES PRINCIPALES CRÉÉES (Membership à créer via l''app)'
    ELSE '⚠️  CERTAINS ÉLÉMENTS MANQUENT'
  END as statut;

-- =====================================================
-- ÉTAPE 8 : Détails de chaque élément
-- =====================================================

SELECT 'DÉTAILS DES DONNÉES CRÉÉES' as section;

-- Organisation
SELECT 
  'Organisation ESAMBA' as type,
  CASE WHEN COUNT(*) > 0 THEN '✅ Créée' ELSE '❌ Absente' END as statut,
  COUNT(*) as nombre
FROM orgs
WHERE name = 'Organisation ESAMBA';

-- Flotte
SELECT 
  'Flotte ESAMBA' as type,
  CASE WHEN COUNT(*) > 0 THEN '✅ Créée' ELSE '❌ Absente' END as statut,
  COUNT(*) as nombre
FROM fleets
WHERE name = 'Flotte ESAMBA';

-- Membership (Note: nécessite un utilisateur authentifié pour être vérifié)
SELECT 
  'Membership Organizer' as type,
  CASE WHEN COUNT(*) > 0 THEN '✅ Créé' ELSE '❌ Absent (créer via l''app)' END as statut,
  COUNT(*) as nombre
FROM fleet_memberships fm
JOIN fleets f ON f.id = fm.fleet_id
WHERE f.name = 'Flotte ESAMBA'
  AND fm.role = 'organizer'
  AND fm.is_active = true;

-- Véhicule
SELECT 
  'Véhicule ESAMBA-001' as type,
  CASE WHEN COUNT(*) > 0 THEN '✅ Créé' ELSE '❌ Absent' END as statut,
  COUNT(*) as nombre
FROM vehicles v
JOIN fleets f ON f.id = v.fleet_id
WHERE f.name = 'Flotte ESAMBA'
  AND v.registration = 'ESAMBA-001';

-- Invitation
SELECT 
  'Invitation ESAMBA-2024' as type,
  CASE WHEN COUNT(*) > 0 THEN '✅ Créée' ELSE '❌ Absente' END as statut,
  COUNT(*) as nombre
FROM fleet_invitations fi
JOIN fleets f ON f.id = fi.fleet_id
WHERE f.name = 'Flotte ESAMBA'
  AND fi.code = 'ESAMBA-2024';

-- =====================================================
-- RÉSUMÉ FINAL
-- =====================================================

SELECT 
  'RÉSUMÉ FINAL' as section,
  (SELECT COUNT(*) FROM orgs WHERE name = 'Organisation ESAMBA') as organisation_count,
  (SELECT COUNT(*) FROM fleets WHERE name = 'Flotte ESAMBA') as flotte_count,
  (SELECT COUNT(*) FROM fleet_memberships fm
   JOIN fleets f ON f.id = fm.fleet_id
   WHERE f.name = 'Flotte ESAMBA' 
     AND fm.role = 'organizer' 
     AND fm.is_active = true) as membership_count,
  (SELECT COUNT(*) FROM vehicles v
   JOIN fleets f ON f.id = v.fleet_id
   WHERE f.name = 'Flotte ESAMBA' 
     AND v.registration = 'ESAMBA-001') as vehicule_count,
  (SELECT COUNT(*) FROM fleet_invitations fi
   JOIN fleets f ON f.id = fi.fleet_id
   WHERE f.name = 'Flotte ESAMBA' 
     AND fi.code = 'ESAMBA-2024') as invitation_count;
