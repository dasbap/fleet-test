-- =====================================================
-- VÉRIFICATION DE COHÉRENCE BASE DE DONNÉES / BACKEND
-- Smart Fleet Africa - E-Samba
-- =====================================================
-- Ce script vérifie que :
-- 1. Toutes les tables utilisées par le backend existent
-- 2. Toutes les colonnes référencées existent
-- 3. Toutes les fonctions RPC appelées existent
-- 4. Les noms de tables sont cohérents (français vs anglais)
-- =====================================================

-- =====================================================
-- ÉTAPE 1 : Vérifier l'existence des tables principales
-- =====================================================

SELECT 
  'VÉRIFICATION TABLES' as section,
  table_name as table,
  CASE 
    WHEN table_name IN (
      'organisations', 'flottes', 'profils', 'flotte_adhesions', 
      'flotte_invitations', 'vehicules', 'affectations_vehicules',
      'creneaux_conducteurs', 'clotures_creneaux', 'incidents',
      'travaux_maintenance', 'preuves_maintenance', 
      'listes_verification_maintenance', 'plans', 'paiements',
      'abonnements', 'droits_vehicules', 'jetons_qr'
    ) THEN '✅ Table française attendue'
    WHEN table_name IN (
      'orgs', 'fleets', 'profiles', 'fleet_memberships',
      'fleet_invitations', 'vehicles', 'driver_vehicle_assignments',
      'driver_shifts', 'shift_closures'
    ) THEN '⚠️  Table anglaise (obsolète)'
    ELSE '❓ Table non référencée'
  END as statut
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY 
  CASE 
    WHEN table_name IN ('organisations', 'flottes', 'profils', 'flotte_adhesions', 
                        'flotte_invitations', 'vehicules', 'affectations_vehicules',
                        'creneaux_conducteurs', 'clotures_creneaux', 'incidents',
                        'travaux_maintenance', 'preuves_maintenance', 
                        'listes_verification_maintenance', 'plans', 'paiements',
                        'abonnements', 'droits_vehicules', 'jetons_qr') THEN 1
    WHEN table_name IN ('orgs', 'fleets', 'profiles', 'fleet_memberships',
                        'fleet_invitations', 'vehicles', 'driver_vehicle_assignments',
                        'driver_shifts', 'shift_closures') THEN 2
    ELSE 3
  END,
  table_name;

-- =====================================================
-- ÉTAPE 2 : Vérifier les colonnes des tables principales
-- =====================================================

-- Vérifier les colonnes de flotte_adhesions
SELECT 
  'COLONNES flotte_adhesions' as section,
  column_name,
  data_type,
  CASE 
    WHEN column_name IN ('id', 'fleet_id', 'user_id', 'role', 'is_active', 'created_at')
    THEN '✅ Colonne attendue'
    ELSE '❓ Colonne supplémentaire'
  END as statut
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'flotte_adhesions'
ORDER BY ordinal_position;

-- Vérifier les colonnes de vehicules
SELECT 
  'COLONNES vehicules' as section,
  column_name,
  data_type,
  CASE 
    WHEN column_name IN ('id', 'fleet_id', 'registration', 'brand', 'model', 
                         'year', 'current_km', 'status', 'blocked_reason', 'created_at')
    THEN '✅ Colonne attendue'
    ELSE '❓ Colonne supplémentaire'
  END as statut
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'vehicules'
ORDER BY ordinal_position;

-- Vérifier les colonnes de flotte_invitations
SELECT 
  'COLONNES flotte_invitations' as section,
  column_name,
  data_type,
  CASE 
    WHEN column_name IN ('id', 'fleet_id', 'code', 'expires_at', 'max_uses', 
                         'current_uses', 'created_by', 'created_at')
    THEN '✅ Colonne attendue'
    ELSE '❓ Colonne supplémentaire'
  END as statut
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'flotte_invitations'
ORDER BY ordinal_position;

-- Vérifier les colonnes de profils
SELECT 
  'COLONNES profils' as section,
  column_name,
  data_type,
  CASE 
    WHEN column_name IN ('user_id', 'full_name', 'phone', 'created_at')
    THEN '✅ Colonne attendue'
    ELSE '❓ Colonne supplémentaire'
  END as statut
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profils'
ORDER BY ordinal_position;

-- =====================================================
-- ÉTAPE 3 : Vérifier les fonctions RPC appelées par le backend
-- =====================================================

SELECT 
  'FONCTIONS RPC' as section,
  proname as fonction,
  CASE 
    WHEN proname IN (
      'fermer_creneau', 'calculer_recette_attendue', 'generer_alertes_automatiques',
      'calculer_score_conducteur', 'creer_flotte_esamba', 'creer_ou_mettre_a_jour_adhesion_flotte',
      'creer_vehicule_esamba', 'creer_invitation_esamba', 'affecter_vehicule',
      'accepter_invitation', 'verifier_sante_systeme', 'reparer_adhesion_orpheline',
      'assurer_profil_utilisateur', 'verifier_esamba_2024', 'ajouter_membre_par_email',
      'rechercher_utilisateurs'
    ) THEN '✅ Fonction attendue'
    ELSE '❓ Fonction non référencée'
  END as statut,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname IN (
    'fermer_creneau', 'calculer_recette_attendue', 'generer_alertes_automatiques',
    'calculer_score_conducteur', 'creer_flotte_esamba', 'creer_ou_mettre_a_jour_adhesion_flotte',
    'creer_vehicule_esamba', 'creer_invitation_esamba', 'affecter_vehicule',
    'accepter_invitation', 'verifier_sante_systeme', 'reparer_adhesion_orpheline',
    'assurer_profil_utilisateur', 'verifier_esamba_2024', 'ajouter_membre_par_email',
    'rechercher_utilisateurs'
  )
ORDER BY proname;

-- Vérifier les fonctions RPC manquantes
SELECT 
  'FONCTIONS RPC MANQUANTES' as section,
  fonction_attendue as fonction,
  '❌ MANQUANTE' as statut
FROM (
  VALUES 
    ('fermer_creneau'),
    ('calculer_recette_attendue'),
    ('generer_alertes_automatiques'),
    ('calculer_score_conducteur'),
    ('creer_flotte_esamba'),
    ('creer_ou_mettre_a_jour_adhesion_flotte'),
    ('creer_vehicule_esamba'),
    ('creer_invitation_esamba'),
    ('affecter_vehicule'),
    ('accepter_invitation'),
    ('verifier_sante_systeme'),
    ('reparer_adhesion_orpheline'),
    ('assurer_profil_utilisateur'),
    ('verifier_esamba_2024'),
    ('ajouter_membre_par_email'),
    ('rechercher_utilisateurs')
) AS fonctions_attendues(fonction_attendue)
WHERE NOT EXISTS (
  SELECT 1 FROM pg_proc 
  WHERE proname = fonction_attendue 
    AND pronamespace = 'public'::regnamespace
);

-- =====================================================
-- ÉTAPE 4 : Vérifier les types ENUM
-- =====================================================

SELECT 
  'TYPES ENUM' as section,
  t.typname as type_enum,
  string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) as valeurs,
  CASE 
    WHEN t.typname = 'role_type' AND string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) = 'driver, manager, mechanic, organizer'
    THEN '✅ Valeurs correctes'
    WHEN t.typname = 'vehicle_status' AND string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) = 'blocked, ok'
    THEN '✅ Valeurs correctes'
    WHEN t.typname = 'closure_status' AND string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) = 'pending, rejected, validated'
    THEN '✅ Valeurs correctes'
    ELSE '⚠️  Vérifier les valeurs'
  END as statut
FROM pg_type t
JOIN pg_enum e ON e.enumtypid = t.oid
WHERE t.typname IN ('role_type', 'vehicle_status', 'closure_status')
GROUP BY t.typname
ORDER BY t.typname;

-- =====================================================
-- ÉTAPE 5 : Vérifier les foreign keys et relations
-- =====================================================

SELECT 
  'RELATIONS FOREIGN KEYS' as section,
  tc.table_name as table_source,
  kcu.column_name as colonne_source,
  ccu.table_name as table_cible,
  ccu.column_name as colonne_cible,
  CASE 
    WHEN tc.table_name IN ('flottes', 'vehicules', 'flotte_adhesions', 'flotte_invitations',
                           'affectations_vehicules', 'creneaux_conducteurs', 'clotures_creneaux')
      AND ccu.table_name IN ('organisations', 'flottes', 'vehicules', 'auth.users', 
                              'affectations_vehicules', 'creneaux_conducteurs')
    THEN '✅ Relation attendue'
    ELSE '❓ Relation à vérifier'
  END as statut
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- =====================================================
-- ÉTAPE 6 : Vérifier les index pour les performances
-- =====================================================

SELECT 
  'INDEXES PERFORMANCE' as section,
  tablename as table,
  indexname as index,
  indexdef as definition,
  CASE 
    WHEN indexname LIKE 'idx_%' OR indexname LIKE '%_pkey' OR indexname LIKE '%_key'
    THEN '✅ Index présent'
    ELSE '⚠️  Index à vérifier'
  END as statut
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('flotte_adhesions', 'vehicules', 'affectations_vehicules',
                    'creneaux_conducteurs', 'clotures_creneaux', 'flotte_invitations')
ORDER BY tablename, indexname;

-- =====================================================
-- ÉTAPE 7 : Vérifier les politiques RLS
-- =====================================================

SELECT 
  'POLITIQUES RLS' as section,
  schemaname || '.' || tablename as table,
  policyname as politique,
  permissive as type,
  roles as roles_appliques,
  CASE 
    WHEN tablename IN ('flotte_adhesions', 'vehicules', 'affectations_vehicules',
                        'creneaux_conducteurs', 'clotures_creneaux', 'flotte_invitations')
      AND policyname IS NOT NULL
    THEN '✅ Politique présente'
    WHEN tablename IN ('flotte_adhesions', 'vehicules', 'affectations_vehicules',
                        'creneaux_conducteurs', 'clotures_creneaux', 'flotte_invitations')
      AND policyname IS NULL
    THEN '❌ Politique manquante'
    ELSE '⚠️  Table sans RLS'
  END as statut
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =====================================================
-- ÉTAPE 8 : RÉSUMÉ DES INCOHÉRENCES
-- =====================================================

DO $$
DECLARE
  v_tables_fr_count integer;
  v_tables_en_count integer;
  v_rpc_missing_count integer;
  v_rpc_total_count integer;
  v_issues text[] := ARRAY[]::text[];
  v_issue text;
BEGIN
  -- Compter les tables françaises
  SELECT COUNT(*) INTO v_tables_fr_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('organisations', 'flottes', 'profils', 'flotte_adhesions', 
                       'flotte_invitations', 'vehicules', 'affectations_vehicules',
                       'creneaux_conducteurs', 'clotures_creneaux');
  
  -- Compter les tables anglaises (obsolètes)
  SELECT COUNT(*) INTO v_tables_en_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('orgs', 'fleets', 'profiles', 'fleet_memberships',
                       'fleet_invitations', 'vehicles', 'driver_vehicle_assignments',
                       'driver_shifts', 'shift_closures');
  
  -- Compter les fonctions RPC manquantes
  SELECT COUNT(*) INTO v_rpc_missing_count
  FROM (
    VALUES 
      ('fermer_creneau'),
      ('calculer_recette_attendue'),
      ('generer_alertes_automatiques'),
      ('calculer_score_conducteur'),
      ('creer_flotte_esamba'),
      ('creer_ou_mettre_a_jour_adhesion_flotte'),
      ('creer_vehicule_esamba'),
      ('creer_invitation_esamba'),
      ('affecter_vehicule'),
      ('accepter_invitation'),
      ('verifier_sante_systeme'),
      ('reparer_adhesion_orpheline'),
      ('assurer_profil_utilisateur'),
      ('verifier_esamba_2024'),
      ('ajouter_membre_par_email'),
      ('rechercher_utilisateurs')
  ) AS fonctions_attendues(fonction_attendue)
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = fonction_attendue 
      AND pronamespace = 'public'::regnamespace
  );
  
  v_rpc_total_count := 16;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RÉSUMÉ DE LA VÉRIFICATION';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tables françaises présentes : %', v_tables_fr_count;
  RAISE NOTICE 'Tables anglaises (obsolètes) : %', v_tables_en_count;
  RAISE NOTICE 'Fonctions RPC manquantes : % / %', v_rpc_missing_count, v_rpc_total_count;
  RAISE NOTICE '========================================';
  
  -- Identifier les problèmes
  IF v_tables_en_count > 0 THEN
    v_issues := array_append(v_issues, format('⚠️  %s table(s) anglaise(s) obsolète(s) détectée(s)', v_tables_en_count));
  END IF;
  
  IF v_rpc_missing_count > 0 THEN
    v_issues := array_append(v_issues, format('❌ %s fonction(s) RPC manquante(s)', v_rpc_missing_count));
  END IF;
  
  IF array_length(v_issues, 1) > 0 THEN
    RAISE NOTICE 'PROBLÈMES DÉTECTÉS :';
    FOREACH v_issue IN ARRAY v_issues
    LOOP
      RAISE NOTICE '  %', v_issue;
    END LOOP;
  ELSE
    RAISE NOTICE '✅ Aucun problème majeur détecté';
  END IF;
  
  RAISE NOTICE '========================================';
END $$;
