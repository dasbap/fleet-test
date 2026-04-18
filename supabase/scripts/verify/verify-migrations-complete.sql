-- =====================================================
-- VÉRIFICATION COMPLÈTE DES MIGRATIONS
-- Smart Fleet Africa - E-Samba
-- =====================================================
-- Ce script vérifie que toutes les migrations ont été appliquées correctement
-- Exécutez ce script après avoir appliqué les migrations
-- =====================================================

-- =====================================================
-- SECTION 1 : VÉRIFICATION DES TABLES
-- =====================================================

SELECT 
  'VÉRIFICATION DES TABLES' as section,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organisations') 
    THEN '✅ organisations'
    ELSE '❌ organisations MANQUANTE'
  END as statut
UNION ALL
SELECT 
  'VÉRIFICATION DES TABLES',
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'flottes') 
    THEN '✅ flottes'
    ELSE '❌ flottes MANQUANTE'
  END
UNION ALL
SELECT 
  'VÉRIFICATION DES TABLES',
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profils') 
    THEN '✅ profils'
    ELSE '❌ profils MANQUANTE'
  END
UNION ALL
SELECT 
  'VÉRIFICATION DES TABLES',
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'affectations_vehicules') 
    THEN '✅ affectations_vehicules'
    ELSE '❌ affectations_vehicules MANQUANTE'
  END
UNION ALL
SELECT 
  'VÉRIFICATION DES TABLES',
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'scores_conducteurs') 
    THEN '✅ scores_conducteurs'
    ELSE '❌ scores_conducteurs MANQUANTE'
  END
UNION ALL
SELECT 
  'VÉRIFICATION DES TABLES',
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'alertes_automatiques') 
    THEN '✅ alertes_automatiques'
    ELSE '❌ alertes_automatiques MANQUANTE'
  END;

-- =====================================================
-- SECTION 2 : VÉRIFICATION DES ENUMS
-- =====================================================

SELECT 
  'VÉRIFICATION DES ENUMS' as section,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_type WHERE typname = 'driver_score_level') 
    THEN '✅ driver_score_level'
    ELSE '❌ driver_score_level MANQUANT'
  END as statut
UNION ALL
SELECT 
  'VÉRIFICATION DES ENUMS',
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_type WHERE typname = 'alert_type') 
    THEN '✅ alert_type'
    ELSE '❌ alert_type MANQUANT'
  END;

-- =====================================================
-- SECTION 3 : VÉRIFICATION DES COLONNES DANS VEHICULES
-- =====================================================

SELECT 
  'VÉRIFICATION COLONNES VEHICULES' as section,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'vehicules' 
      AND column_name = 'registration'
    ) 
    THEN '✅ registration'
    ELSE '❌ registration MANQUANTE'
  END as statut
UNION ALL
SELECT 
  'VÉRIFICATION COLONNES VEHICULES',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'vehicules' 
      AND column_name = 'current_km'
    ) 
    THEN '✅ current_km'
    ELSE '❌ current_km MANQUANTE'
  END
UNION ALL
SELECT 
  'VÉRIFICATION COLONNES VEHICULES',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'vehicules' 
      AND column_name = 'created_at'
    ) 
    THEN '✅ created_at'
    ELSE '❌ created_at MANQUANTE'
  END;

-- =====================================================
-- SECTION 4 : VÉRIFICATION DES COLONNES DANS CLOTURES_CRENEAUX
-- =====================================================

SELECT 
  'VÉRIFICATION COLONNES CLOTURES' as section,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'clotures_creneaux' 
      AND column_name = 'expected_revenue'
    ) 
    THEN '✅ expected_revenue'
    ELSE '❌ expected_revenue MANQUANTE'
  END as statut
UNION ALL
SELECT 
  'VÉRIFICATION COLONNES CLOTURES',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'clotures_creneaux' 
      AND column_name = 'revenue_gap'
    ) 
    THEN '✅ revenue_gap'
    ELSE '❌ revenue_gap MANQUANTE'
  END;

-- =====================================================
-- SECTION 5 : VÉRIFICATION DES FONCTIONS RPC
-- =====================================================

SELECT 
  'VÉRIFICATION FONCTIONS RPC' as section,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'calculer_recette_attendue'
    ) 
    THEN '✅ calculer_recette_attendue'
    ELSE '❌ calculer_recette_attendue MANQUANTE'
  END as statut
UNION ALL
SELECT 
  'VÉRIFICATION FONCTIONS RPC',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'calculer_score_conducteur'
    ) 
    THEN '✅ calculer_score_conducteur'
    ELSE '❌ calculer_score_conducteur MANQUANTE'
  END
UNION ALL
SELECT 
  'VÉRIFICATION FONCTIONS RPC',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'generer_alertes_automatiques'
    ) 
    THEN '✅ generer_alertes_automatiques'
    ELSE '❌ generer_alertes_automatiques MANQUANTE'
  END;

-- =====================================================
-- SECTION 6 : COMPTAGE DES DONNÉES EXISTANTES
-- =====================================================

SELECT 
  'COMPTAGE DONNÉES' as section,
  'flotte_adhesions: ' || COUNT(*)::text as statut
FROM flotte_adhesions
UNION ALL
SELECT 
  'COMPTAGE DONNÉES',
  'vehicules: ' || COUNT(*)::text
FROM vehicules
UNION ALL
SELECT 
  'COMPTAGE DONNÉES',
  'creneaux_conducteurs: ' || COUNT(*)::text
FROM creneaux_conducteurs
UNION ALL
SELECT 
  'COMPTAGE DONNÉES',
  'clotures_creneaux: ' || COUNT(*)::text
FROM clotures_creneaux
UNION ALL
SELECT 
  'COMPTAGE DONNÉES',
  'incidents: ' || COUNT(*)::text
FROM incidents
UNION ALL
SELECT 
  'COMPTAGE DONNÉES',
  'travaux_maintenance: ' || COUNT(*)::text
FROM travaux_maintenance;

-- =====================================================
-- SECTION 7 : VÉRIFICATION DES FOREIGN KEYS CRITIQUES
-- =====================================================

SELECT 
  'VÉRIFICATION FK' as section,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'flottes_org_id_fkey'
    ) 
    THEN '✅ flottes.org_id → organisations.id'
    ELSE '❌ flottes.org_id → organisations.id MANQUANTE'
  END as statut
UNION ALL
SELECT 
  'VÉRIFICATION FK',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'vehicules_fleet_id_fkey'
    ) 
    THEN '✅ vehicules.fleet_id → flottes.id'
    ELSE '❌ vehicules.fleet_id → flottes.id MANQUANTE'
  END
UNION ALL
SELECT 
  'VÉRIFICATION FK',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'affectations_vehicules_vehicle_id_fkey'
    ) 
    THEN '✅ affectations_vehicules.vehicle_id → vehicules.id'
    ELSE '❌ affectations_vehicules.vehicle_id → vehicules.id MANQUANTE'
  END
UNION ALL
SELECT 
  'VÉRIFICATION FK',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'scores_conducteurs_fleet_id_fkey'
    ) 
    THEN '✅ scores_conducteurs.fleet_id → flottes.id'
    ELSE '❌ scores_conducteurs.fleet_id → flottes.id MANQUANTE'
  END
UNION ALL
SELECT 
  'VÉRIFICATION FK',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'alertes_automatiques_fleet_id_fkey'
    ) 
    THEN '✅ alertes_automatiques.fleet_id → flottes.id'
    ELSE '❌ alertes_automatiques.fleet_id → flottes.id MANQUANTE'
  END;

-- =====================================================
-- SECTION 8 : RÉSUMÉ FINAL
-- =====================================================

DO $$
DECLARE
  v_tables_count int;
  v_enums_count int;
  v_functions_count int;
  v_all_ok boolean := true;
BEGIN
  -- Compter les tables
  SELECT COUNT(*) INTO v_tables_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'organisations', 'flottes', 'profils', 'affectations_vehicules',
      'scores_conducteurs', 'alertes_automatiques'
    );

  -- Compter les enums
  SELECT COUNT(*) INTO v_enums_count
  FROM pg_type
  WHERE typname IN ('driver_score_level', 'alert_type');

  -- Compter les fonctions RPC
  SELECT COUNT(*) INTO v_functions_count
  FROM pg_proc
  WHERE proname IN (
    'calculer_recette_attendue',
    'calculer_score_conducteur',
    'generer_alertes_automatiques'
  );

  RAISE NOTICE '========================================';
  RAISE NOTICE 'RÉSUMÉ DE LA VÉRIFICATION';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tables créées: %/6', v_tables_count;
  RAISE NOTICE 'Enums créés: %/2', v_enums_count;
  RAISE NOTICE 'Fonctions RPC créées: %/3', v_functions_count;
  RAISE NOTICE '========================================';

  IF v_tables_count = 6 AND v_enums_count = 2 AND v_functions_count = 3 THEN
    RAISE NOTICE '✅ TOUTES LES MIGRATIONS ONT ÉTÉ APPLIQUÉES AVEC SUCCÈS';
  ELSE
    RAISE NOTICE '⚠️  CERTAINES MIGRATIONS SONT INCOMPLÈTES';
    RAISE NOTICE 'Vérifiez les sections ci-dessus pour plus de détails.';
    v_all_ok := false;
  END IF;

  RAISE NOTICE '========================================';
END $$;
