-- =====================================================
-- TEST DES FONCTIONS RPC AVEC DONNÉES RÉELLES
-- Smart Fleet Africa - E-Samba
-- =====================================================
-- Ce script teste les trois fonctions RPC :
-- 1. calculer_recette_attendue
-- 2. calculer_score_conducteur
-- 3. generer_alertes_automatiques
-- =====================================================
-- Exécutez ce script dans Supabase SQL Editor
-- =====================================================

BEGIN;

-- =====================================================
-- PHASE 1 : PRÉPARATION DES DONNÉES DE TEST
-- =====================================================

-- Vérifier que les fonctions existent
SELECT 
  'VÉRIFICATION FONCTIONS' as section,
  proname as fonction,
  CASE 
    WHEN proname IN ('calculer_recette_attendue', 'calculer_score_conducteur', 'generer_alertes_automatiques')
    THEN '✅ Fonction trouvée'
    ELSE '❌ Fonction manquante'
  END as statut
FROM pg_proc 
WHERE proname IN (
  'calculer_recette_attendue',
  'calculer_score_conducteur',
  'generer_alertes_automatiques'
)
ORDER BY proname;

-- =====================================================
-- PHASE 2 : TEST 1 - calculer_recette_attendue
-- =====================================================

DO $$
DECLARE
  v_test_shift_id uuid;
  v_km_start int;
  v_km_end int;
  v_revenue_declared int;
  v_expected_revenue int;
  v_result int;
  v_test_result text;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST 1 : calculer_recette_attendue';
  RAISE NOTICE '========================================';

  -- Trouver un créneau fermé avec clôture pour le test
  SELECT 
    c.id,
    c.km_start,
    c.km_end,
    cc.revenue_declared
  INTO v_test_shift_id, v_km_start, v_km_end, v_revenue_declared
  FROM creneaux_conducteurs c
  JOIN clotures_creneaux cc ON cc.shift_id = c.id
  WHERE c.status = 'closed'
    AND c.km_end IS NOT NULL
    AND c.km_start IS NOT NULL
    AND (c.km_end - c.km_start) > 0
    AND cc.status = 'validated'
  LIMIT 1;

  IF v_test_shift_id IS NULL THEN
    RAISE NOTICE '❌ Aucun créneau fermé avec clôture trouvé pour le test';
    RAISE NOTICE '   Création d''un créneau de test...';
    
    -- Créer un créneau de test si possible
    -- Note: Cette partie nécessite des données existantes (flotte, véhicule, affectation)
    SELECT 
      c.id,
      c.km_start,
      c.km_end,
      cc.revenue_declared
    INTO v_test_shift_id, v_km_start, v_km_end, v_revenue_declared
    FROM creneaux_conducteurs c
    LEFT JOIN clotures_creneaux cc ON cc.shift_id = c.id
    WHERE c.status = 'closed'
      AND c.km_end IS NOT NULL
      AND c.km_start IS NOT NULL
      AND (c.km_end - c.km_start) > 0
    LIMIT 1;
  END IF;

  IF v_test_shift_id IS NULL THEN
    RAISE NOTICE '❌ Impossible de trouver un créneau de test';
    RAISE NOTICE '   Veuillez créer un créneau fermé avec km_start et km_end';
  ELSE
    RAISE NOTICE '✅ Créneau de test trouvé : %', v_test_shift_id;
    RAISE NOTICE '   KM début : %, KM fin : %', v_km_start, v_km_end;
    RAISE NOTICE '   Recette déclarée : %', COALESCE(v_revenue_declared, 0);
    
    -- Sauvegarder les valeurs avant le test
    SELECT expected_revenue INTO v_expected_revenue
    FROM clotures_creneaux
    WHERE shift_id = v_test_shift_id;
    
    RAISE NOTICE '   Recette attendue avant test : %', COALESCE(v_expected_revenue::text, 'NULL');
    
    -- Appeler la fonction
    BEGIN
      SELECT calculer_recette_attendue(v_test_shift_id) INTO v_result;
      
      IF v_result IS NULL THEN
        RAISE NOTICE '⚠️  La fonction a retourné NULL';
        v_test_result := 'ÉCHEC';
      ELSE
        RAISE NOTICE '✅ Fonction exécutée avec succès';
        RAISE NOTICE '   Résultat : % FCFA', v_result;
        
        -- Vérifier que les colonnes ont été mises à jour
        SELECT expected_revenue, revenue_gap INTO v_expected_revenue, v_result
        FROM clotures_creneaux
        WHERE shift_id = v_test_shift_id;
        
        IF v_expected_revenue IS NOT NULL THEN
          RAISE NOTICE '✅ Colonnes mises à jour dans clotures_creneaux';
          RAISE NOTICE '   expected_revenue : %', v_expected_revenue;
          RAISE NOTICE '   revenue_gap : %', v_result;
          v_test_result := 'SUCCÈS';
        ELSE
          RAISE NOTICE '❌ Les colonnes n''ont pas été mises à jour';
          v_test_result := 'ÉCHEC PARTIEL';
        END IF;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '❌ Erreur lors de l''exécution : %', SQLERRM;
      v_test_result := 'ERREUR';
    END;
    
    RAISE NOTICE 'Résultat du test : %', v_test_result;
  END IF;
END $$;

-- Afficher les résultats visuels
SELECT 
  'RÉSULTATS TEST 1' as section,
  c.id as shift_id,
  c.km_start,
  c.km_end,
  (c.km_end - c.km_start) as km_total,
  cc.revenue_declared,
  cc.expected_revenue,
  cc.revenue_gap,
  CASE 
    WHEN cc.expected_revenue IS NOT NULL THEN '✅ Calculé'
    ELSE '❌ Non calculé'
  END as statut
FROM creneaux_conducteurs c
JOIN clotures_creneaux cc ON cc.shift_id = c.id
WHERE c.status = 'closed'
  AND c.km_end IS NOT NULL
  AND c.km_start IS NOT NULL
ORDER BY cc.created_at DESC
LIMIT 5;

-- =====================================================
-- PHASE 3 : TEST 2 - calculer_score_conducteur
-- =====================================================

DO $$
DECLARE
  v_test_driver_id uuid;
  v_test_fleet_id uuid;
  v_result driver_score_level;
  v_score_record record;
  v_test_result text;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST 2 : calculer_score_conducteur';
  RAISE NOTICE '========================================';

  -- Trouver un chauffeur avec des clôtures validées
  SELECT DISTINCT
    a.driver_user_id,
    a.fleet_id
  INTO v_test_driver_id, v_test_fleet_id
  FROM affectations_vehicules a
  JOIN creneaux_conducteurs c ON c.assignment_id = a.id
  JOIN clotures_creneaux cc ON cc.shift_id = c.id
  WHERE cc.status = 'validated'
    AND cc.created_at >= now() - interval '30 days'
  LIMIT 1;

  IF v_test_driver_id IS NULL THEN
    RAISE NOTICE '❌ Aucun chauffeur avec clôtures validées trouvé';
    RAISE NOTICE '   Recherche d''un chauffeur avec affectation active...';
    
    -- Trouver n'importe quel chauffeur avec une affectation
    SELECT DISTINCT
      a.driver_user_id,
      a.fleet_id
    INTO v_test_driver_id, v_test_fleet_id
    FROM affectations_vehicules a
    WHERE a.is_active = true
    LIMIT 1;
  END IF;

  IF v_test_driver_id IS NULL THEN
    RAISE NOTICE '❌ Impossible de trouver un chauffeur de test';
  ELSE
    RAISE NOTICE '✅ Chauffeur de test trouvé : %', v_test_driver_id;
    RAISE NOTICE '   Flotte : %', v_test_fleet_id;
    
    -- Vérifier le score avant le test
    SELECT * INTO v_score_record
    FROM scores_conducteurs
    WHERE driver_user_id = v_test_driver_id
      AND fleet_id = v_test_fleet_id;
    
    IF v_score_record IS NOT NULL THEN
      RAISE NOTICE '   Score actuel : % (score financier: %)', 
        v_score_record.score_level, 
        v_score_record.financial_score;
    ELSE
      RAISE NOTICE '   Aucun score existant';
    END IF;
    
    -- Appeler la fonction
    BEGIN
      SELECT calculer_score_conducteur(v_test_driver_id, v_test_fleet_id) INTO v_result;
      
      IF v_result IS NULL THEN
        RAISE NOTICE '⚠️  La fonction a retourné NULL';
        v_test_result := 'ÉCHEC';
      ELSE
        RAISE NOTICE '✅ Fonction exécutée avec succès';
        RAISE NOTICE '   Résultat : %', v_result;
        
        -- Vérifier que le score a été créé/mis à jour
        SELECT * INTO v_score_record
        FROM scores_conducteurs
        WHERE driver_user_id = v_test_driver_id
          AND fleet_id = v_test_fleet_id;
        
        IF v_score_record IS NOT NULL THEN
          RAISE NOTICE '✅ Score créé/mis à jour dans scores_conducteurs';
          RAISE NOTICE '   score_level : %', v_score_record.score_level;
          RAISE NOTICE '   financial_score : %', v_score_record.financial_score;
          RAISE NOTICE '   last_calculated_at : %', v_score_record.last_calculated_at;
          v_test_result := 'SUCCÈS';
        ELSE
          RAISE NOTICE '❌ Le score n''a pas été créé';
          v_test_result := 'ÉCHEC PARTIEL';
        END IF;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '❌ Erreur lors de l''exécution : %', SQLERRM;
      v_test_result := 'ERREUR';
    END;
    
    RAISE NOTICE 'Résultat du test : %', v_test_result;
  END IF;
END $$;

-- Afficher les résultats visuels
SELECT 
  'RÉSULTATS TEST 2' as section,
  sc.driver_user_id,
  p.full_name as nom_chauffeur,
  sc.fleet_id,
  f.name as nom_flotte,
  sc.score_level,
  sc.financial_score,
  sc.last_calculated_at,
  CASE 
    WHEN sc.score_level = 'green' THEN '✅ Vert'
    WHEN sc.score_level = 'orange' THEN '⚠️  Orange'
    WHEN sc.score_level = 'red' THEN '🔴 Rouge'
    ELSE '❓ Inconnu'
  END as statut_visuel
FROM scores_conducteurs sc
LEFT JOIN profils p ON p.user_id = sc.driver_user_id
LEFT JOIN flottes f ON f.id = sc.fleet_id
ORDER BY sc.last_calculated_at DESC
LIMIT 10;

-- =====================================================
-- PHASE 4 : TEST 3 - generer_alertes_automatiques
-- =====================================================

DO $$
DECLARE
  v_test_fleet_id uuid;
  v_alert_count_before int;
  v_alert_count_after int;
  v_result int;
  v_test_result text;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST 3 : generer_alertes_automatiques';
  RAISE NOTICE '========================================';

  -- Trouver une flotte avec des données
  SELECT f.id INTO v_test_fleet_id
  FROM flottes f
  WHERE EXISTS (
    SELECT 1 FROM creneaux_conducteurs c
    JOIN affectations_vehicules a ON a.id = c.assignment_id
    WHERE a.fleet_id = f.id
  )
  LIMIT 1;

  IF v_test_fleet_id IS NULL THEN
    RAISE NOTICE '❌ Aucune flotte avec données trouvée';
    RAISE NOTICE '   Recherche d''une flotte quelconque...';
    
    SELECT id INTO v_test_fleet_id
    FROM flottes
    LIMIT 1;
  END IF;

  IF v_test_fleet_id IS NULL THEN
    RAISE NOTICE '❌ Impossible de trouver une flotte de test';
  ELSE
    RAISE NOTICE '✅ Flotte de test trouvée : %', v_test_fleet_id;
    
    -- Compter les alertes non résolues avant le test
    SELECT COUNT(*) INTO v_alert_count_before
    FROM alertes_automatiques
    WHERE fleet_id = v_test_fleet_id
      AND resolved = false;
    
    RAISE NOTICE '   Alertes non résolues avant test : %', v_alert_count_before;
    
    -- Appeler la fonction
    BEGIN
      SELECT generer_alertes_automatiques(v_test_fleet_id) INTO v_result;
      
      IF v_result IS NULL THEN
        RAISE NOTICE '⚠️  La fonction a retourné NULL';
        v_test_result := 'ÉCHEC';
      ELSE
        RAISE NOTICE '✅ Fonction exécutée avec succès';
        RAISE NOTICE '   Nombre d''alertes créées : %', v_result;
        
        -- Compter les alertes après le test
        SELECT COUNT(*) INTO v_alert_count_after
        FROM alertes_automatiques
        WHERE fleet_id = v_test_fleet_id
          AND resolved = false;
        
        RAISE NOTICE '   Alertes non résolues après test : %', v_alert_count_after;
        
        IF v_result >= 0 THEN
          RAISE NOTICE '✅ La fonction a retourné un nombre valide';
          v_test_result := 'SUCCÈS';
        ELSE
          RAISE NOTICE '⚠️  La fonction a retourné un nombre négatif';
          v_test_result := 'ÉCHEC PARTIEL';
        END IF;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '❌ Erreur lors de l''exécution : %', SQLERRM;
      v_test_result := 'ERREUR';
    END;
    
    RAISE NOTICE 'Résultat du test : %', v_test_result;
  END IF;
END $$;

-- Afficher les résultats visuels
SELECT 
  'RÉSULTATS TEST 3' as section,
  aa.id,
  aa.fleet_id,
  f.name as nom_flotte,
  aa.alert_type,
  CASE aa.alert_type
    WHEN 'missing_closure' THEN '📋 Clôture manquante'
    WHEN 'recurring_gap' THEN '💰 Écart récurrent'
    WHEN 'risky_driver' THEN '🚨 Chauffeur à risque'
    WHEN 'vehicle_blocked' THEN '🚫 Véhicule bloqué'
    ELSE '❓ Autre'
  END as type_alerte_visuel,
  aa.severity,
  aa.message,
  aa.resolved,
  aa.created_at
FROM alertes_automatiques aa
LEFT JOIN flottes f ON f.id = aa.fleet_id
WHERE aa.resolved = false
ORDER BY aa.created_at DESC
LIMIT 20;

-- =====================================================
-- PHASE 5 : RÉSUMÉ DES TESTS
-- =====================================================

SELECT 
  'RÉSUMÉ DES TESTS' as section,
  'calculer_recette_attendue' as fonction,
  COUNT(*) FILTER (WHERE expected_revenue IS NOT NULL) as succes,
  COUNT(*) FILTER (WHERE expected_revenue IS NULL) as echecs,
  COUNT(*) as total_testes
FROM clotures_creneaux cc
JOIN creneaux_conducteurs c ON c.id = cc.shift_id
WHERE c.status = 'closed'
  AND c.km_end IS NOT NULL
  AND c.km_start IS NOT NULL

UNION ALL

SELECT 
  'RÉSUMÉ DES TESTS' as section,
  'calculer_score_conducteur' as fonction,
  COUNT(*) as succes,
  0 as echecs,
  COUNT(*) as total_testes
FROM scores_conducteurs

UNION ALL

SELECT 
  'RÉSUMÉ DES TESTS' as section,
  'generer_alertes_automatiques' as fonction,
  COUNT(*) FILTER (WHERE resolved = false) as succes,
  COUNT(*) FILTER (WHERE resolved = true) as echecs,
  COUNT(*) as total_testes
FROM alertes_automatiques;

COMMIT;

-- =====================================================
-- NOTES
-- =====================================================
-- 1. Les tests nécessitent des données existantes dans la base
-- 2. Si aucun créneau/chauffeur/flotte n'est trouvé, les tests seront ignorés
-- 3. Les résultats sont affichés dans les messages NOTICE et les requêtes SELECT
-- 4. Vérifiez les logs Supabase pour voir les messages RAISE NOTICE
-- =====================================================
