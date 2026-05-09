-- =====================================================
-- EXTENSION DU SCHÉMA POUR SCORES ET ALERTES
-- Smart Fleet Africa - E-Samba
-- =====================================================
-- Cette migration ajoute :
-- 1. Enums pour scores et alertes
-- 2. Tables scores_conducteurs et alertes_automatiques
-- 3. Colonnes métier dans clotures_creneaux
-- 4. Index de performance
-- 5. Fonctions RPC pour calculs métier
-- =====================================================

BEGIN;

-- =====================================================
-- PHASE 1 : CRÉATION DES ENUMS MANQUANTS
-- =====================================================

-- Enum driver_score_level
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'driver_score_level') THEN
    CREATE TYPE driver_score_level AS ENUM ('green', 'orange', 'red');
  END IF;
END $$;

-- Enum alert_type
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'alert_type') THEN
    CREATE TYPE alert_type AS ENUM ('missing_closure', 'recurring_gap', 'risky_driver', 'vehicle_blocked');
  END IF;
END $$;

-- =====================================================
-- PHASE 2 : COLONNES MÉTIER DANS CLOTURES_CRENEAUX
-- =====================================================

-- Ajouter expected_revenue si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'clotures_creneaux' 
    AND column_name = 'expected_revenue'
  ) THEN
    ALTER TABLE clotures_creneaux ADD COLUMN expected_revenue int;
  END IF;
END $$;

-- Ajouter revenue_gap si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'clotures_creneaux' 
    AND column_name = 'revenue_gap'
  ) THEN
    ALTER TABLE clotures_creneaux ADD COLUMN revenue_gap int;
  END IF;
END $$;

-- =====================================================
-- PHASE 3 : TABLES D'EXTENSION
-- =====================================================

-- Table scores_conducteurs
CREATE TABLE IF NOT EXISTS scores_conducteurs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_user_id uuid NOT NULL,
  fleet_id uuid NOT NULL,
  score_level driver_score_level NOT NULL DEFAULT 'green',
  financial_score numeric(5,2) NOT NULL DEFAULT 100.00 CHECK (financial_score >= 0 AND financial_score <= 100),
  last_calculated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(driver_user_id, fleet_id)
);

-- Table alertes_automatiques
CREATE TABLE IF NOT EXISTS alertes_automatiques (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_id uuid NOT NULL,
  alert_type alert_type NOT NULL,
  driver_user_id uuid,
  vehicle_id uuid,
  shift_id uuid,
  severity text NOT NULL DEFAULT 'medium', -- low|medium|high|critical
  message text NOT NULL,
  resolved boolean NOT NULL DEFAULT false,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- PHASE 4 : FOREIGN KEYS POUR LES NOUVELLES TABLES
-- =====================================================

-- FK scores_conducteurs.driver_user_id → auth.users.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'scores_conducteurs_driver_user_id_fkey'
  ) THEN
    ALTER TABLE scores_conducteurs ADD CONSTRAINT scores_conducteurs_driver_user_id_fkey 
    FOREIGN KEY (driver_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- FK scores_conducteurs.fleet_id → flottes.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'scores_conducteurs_fleet_id_fkey'
  ) THEN
    ALTER TABLE scores_conducteurs ADD CONSTRAINT scores_conducteurs_fleet_id_fkey 
    FOREIGN KEY (fleet_id) REFERENCES flottes(id) ON DELETE CASCADE;
  END IF;
END $$;

-- FK alertes_automatiques.fleet_id → flottes.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'alertes_automatiques_fleet_id_fkey'
  ) THEN
    ALTER TABLE alertes_automatiques ADD CONSTRAINT alertes_automatiques_fleet_id_fkey 
    FOREIGN KEY (fleet_id) REFERENCES flottes(id) ON DELETE CASCADE;
  END IF;
END $$;

-- FK alertes_automatiques.driver_user_id → auth.users.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'alertes_automatiques_driver_user_id_fkey'
  ) THEN
    ALTER TABLE alertes_automatiques ADD CONSTRAINT alertes_automatiques_driver_user_id_fkey 
    FOREIGN KEY (driver_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- FK alertes_automatiques.vehicle_id → vehicules.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'alertes_automatiques_vehicle_id_fkey'
  ) THEN
    ALTER TABLE alertes_automatiques ADD CONSTRAINT alertes_automatiques_vehicle_id_fkey 
    FOREIGN KEY (vehicle_id) REFERENCES vehicules(id) ON DELETE SET NULL;
  END IF;
END $$;

-- FK alertes_automatiques.shift_id → creneaux_conducteurs.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'alertes_automatiques_shift_id_fkey'
  ) THEN
    ALTER TABLE alertes_automatiques ADD CONSTRAINT alertes_automatiques_shift_id_fkey 
    FOREIGN KEY (shift_id) REFERENCES creneaux_conducteurs(id) ON DELETE SET NULL;
  END IF;
END $$;

-- FK alertes_automatiques.resolved_by → auth.users.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'alertes_automatiques_resolved_by_fkey'
  ) THEN
    ALTER TABLE alertes_automatiques ADD CONSTRAINT alertes_automatiques_resolved_by_fkey 
    FOREIGN KEY (resolved_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- =====================================================
-- PHASE 5 : INDEX DE PERFORMANCE
-- =====================================================

-- Index pour flottes
CREATE INDEX IF NOT EXISTS idx_flottes_org_id ON flottes(org_id);

-- Index pour flotte_adhesions
CREATE INDEX IF NOT EXISTS idx_flotte_adhesions_fleet_id ON flotte_adhesions(fleet_id);
CREATE INDEX IF NOT EXISTS idx_flotte_adhesions_user_id ON flotte_adhesions(user_id);
CREATE INDEX IF NOT EXISTS idx_flotte_adhesions_role ON flotte_adhesions(role);

-- Index pour vehicules
CREATE INDEX IF NOT EXISTS idx_vehicules_fleet_id ON vehicules(fleet_id);
CREATE INDEX IF NOT EXISTS idx_vehicules_status ON vehicules(status);

-- Index pour affectations_vehicules
CREATE INDEX IF NOT EXISTS idx_affectations_vehicules_fleet_id ON affectations_vehicules(fleet_id);
CREATE INDEX IF NOT EXISTS idx_affectations_vehicules_driver_user_id ON affectations_vehicules(driver_user_id);
CREATE INDEX IF NOT EXISTS idx_affectations_vehicules_vehicle_id ON affectations_vehicules(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_affectations_vehicules_is_active ON affectations_vehicules(is_active);

-- Index pour creneaux_conducteurs
CREATE INDEX IF NOT EXISTS idx_creneaux_conducteurs_assignment_id ON creneaux_conducteurs(assignment_id);
CREATE INDEX IF NOT EXISTS idx_creneaux_conducteurs_status ON creneaux_conducteurs(status);
CREATE INDEX IF NOT EXISTS idx_creneaux_conducteurs_started_at ON creneaux_conducteurs(started_at);

-- Index pour clotures_creneaux
CREATE INDEX IF NOT EXISTS idx_clotures_creneaux_shift_id ON clotures_creneaux(shift_id);
CREATE INDEX IF NOT EXISTS idx_clotures_creneaux_status ON clotures_creneaux(status);
CREATE INDEX IF NOT EXISTS idx_clotures_creneaux_validated_by ON clotures_creneaux(validated_by);

-- Index pour incidents
CREATE INDEX IF NOT EXISTS idx_incidents_vehicle_id ON incidents(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_incidents_driver_user_id ON incidents(driver_user_id);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);

-- Index pour travaux_maintenance
CREATE INDEX IF NOT EXISTS idx_travaux_maintenance_fleet_id ON travaux_maintenance(fleet_id);
CREATE INDEX IF NOT EXISTS idx_travaux_maintenance_vehicle_id ON travaux_maintenance(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_travaux_maintenance_status ON travaux_maintenance(status);
CREATE INDEX IF NOT EXISTS idx_travaux_maintenance_priority ON travaux_maintenance(priority);

-- Index pour scores_conducteurs
CREATE INDEX IF NOT EXISTS idx_scores_conducteurs_driver_user_id ON scores_conducteurs(driver_user_id);
CREATE INDEX IF NOT EXISTS idx_scores_conducteurs_fleet_id ON scores_conducteurs(fleet_id);
CREATE INDEX IF NOT EXISTS idx_scores_conducteurs_score_level ON scores_conducteurs(score_level);

-- Index pour alertes_automatiques
CREATE INDEX IF NOT EXISTS idx_alertes_automatiques_fleet_id ON alertes_automatiques(fleet_id);
CREATE INDEX IF NOT EXISTS idx_alertes_automatiques_resolved ON alertes_automatiques(resolved);
CREATE INDEX IF NOT EXISTS idx_alertes_automatiques_alert_type ON alertes_automatiques(alert_type);
CREATE INDEX IF NOT EXISTS idx_alertes_automatiques_driver_user_id ON alertes_automatiques(driver_user_id);
CREATE INDEX IF NOT EXISTS idx_alertes_automatiques_created_at ON alertes_automatiques(created_at);

-- =====================================================
-- PHASE 6 : FONCTIONS RPC POUR CALCULS MÉTIER
-- =====================================================

-- Fonction : calculer_score_conducteur
CREATE OR REPLACE FUNCTION calculer_score_conducteur(
  p_driver_user_id uuid,
  p_fleet_id uuid
)
RETURNS driver_score_level
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_financial_score numeric(5,2);
  v_score_level driver_score_level;
  v_recent_closures_count int;
  v_gaps_count int;
  v_total_revenue_declared int;
  v_total_revenue_expected int;
  v_gap_percentage numeric;
BEGIN
  -- Compter les clôtures des 30 derniers jours
  SELECT COUNT(*)
  INTO v_recent_closures_count
  FROM clotures_creneaux cc
  JOIN creneaux_conducteurs c ON c.id = cc.shift_id
  JOIN affectations_vehicules a ON a.id = c.assignment_id
  WHERE a.driver_user_id = p_driver_user_id
    AND a.fleet_id = p_fleet_id
    AND cc.created_at >= now() - interval '30 days'
    AND cc.status = 'validated';

  -- Si pas assez de données, retourner green par défaut
  IF v_recent_closures_count < 5 THEN
    v_score_level := 'green';
    v_financial_score := 100.00;
  ELSE
    -- Calculer les écarts récurrents
    SELECT COUNT(*)
    INTO v_gaps_count
    FROM clotures_creneaux cc
    JOIN creneaux_conducteurs c ON c.id = cc.shift_id
    JOIN affectations_vehicules a ON a.id = c.assignment_id
    WHERE a.driver_user_id = p_driver_user_id
      AND a.fleet_id = p_fleet_id
      AND cc.created_at >= now() - interval '30 days'
      AND cc.status = 'validated'
      AND cc.revenue_gap IS NOT NULL
      AND cc.revenue_gap < 0
      AND ABS(cc.revenue_gap) > (cc.expected_revenue * 0.1); -- Écart > 10%

    -- Calculer le pourcentage d'écart moyen
    SELECT 
      COALESCE(SUM(cc.revenue_declared), 0),
      COALESCE(SUM(cc.expected_revenue), 0)
    INTO v_total_revenue_declared, v_total_revenue_expected
    FROM clotures_creneaux cc
    JOIN creneaux_conducteurs c ON c.id = cc.shift_id
    JOIN affectations_vehicules a ON a.id = c.assignment_id
    WHERE a.driver_user_id = p_driver_user_id
      AND a.fleet_id = p_fleet_id
      AND cc.created_at >= now() - interval '30 days'
      AND cc.status = 'validated';

    IF v_total_revenue_expected > 0 THEN
      v_gap_percentage := ((v_total_revenue_expected - v_total_revenue_declared)::numeric / v_total_revenue_expected::numeric) * 100;
    ELSE
      v_gap_percentage := 0;
    END IF;

    -- Calculer le score financier (0-100)
    v_financial_score := GREATEST(0, LEAST(100, 100 - ABS(v_gap_percentage) - (v_gaps_count * 5)));

    -- Déterminer le niveau de score
    IF v_financial_score >= 80 AND v_gaps_count = 0 THEN
      v_score_level := 'green';
    ELSIF v_financial_score >= 60 OR v_gaps_count <= 2 THEN
      v_score_level := 'orange';
    ELSE
      v_score_level := 'red';
    END IF;
  END IF;

  -- Mettre à jour ou insérer le score
  INSERT INTO scores_conducteurs (driver_user_id, fleet_id, score_level, financial_score, last_calculated_at)
  VALUES (p_driver_user_id, p_fleet_id, v_score_level, v_financial_score, now())
  ON CONFLICT (driver_user_id, fleet_id) 
  DO UPDATE SET
    score_level = EXCLUDED.score_level,
    financial_score = EXCLUDED.financial_score,
    last_calculated_at = EXCLUDED.last_calculated_at;

  RETURN v_score_level;
END;
$$;

-- Fonction : calculer_recette_attendue
CREATE OR REPLACE FUNCTION calculer_recette_attendue(
  p_shift_id uuid
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expected_revenue int;
  v_driver_user_id uuid;
  v_fleet_id uuid;
  v_km_start int;
  v_km_end int;
  v_km_total int;
  v_avg_revenue_per_km numeric;
BEGIN
  -- Récupérer les informations du créneau
  SELECT 
    a.driver_user_id,
    a.fleet_id,
    c.km_start,
    c.km_end
  INTO v_driver_user_id, v_fleet_id, v_km_start, v_km_end
  FROM creneaux_conducteurs c
  JOIN affectations_vehicules a ON a.id = c.assignment_id
  WHERE c.id = p_shift_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Calculer le kilométrage
  IF v_km_end IS NULL OR v_km_start IS NULL THEN
    RETURN NULL;
  END IF;

  v_km_total := v_km_end - v_km_start;

  -- Calculer la recette moyenne par km sur les 30 derniers jours pour ce chauffeur
  SELECT 
    CASE 
      WHEN SUM(c.km_end - c.km_start) > 0 
      THEN (SUM(cc.revenue_declared)::numeric / SUM(c.km_end - c.km_start)::numeric)
      ELSE 0
    END
  INTO v_avg_revenue_per_km
  FROM creneaux_conducteurs c
  JOIN affectations_vehicules a ON a.id = c.assignment_id
  JOIN clotures_creneaux cc ON cc.shift_id = c.id
  WHERE a.driver_user_id = v_driver_user_id
    AND a.fleet_id = v_fleet_id
    AND c.status = 'closed'
    AND cc.status = 'validated'
    AND c.ended_at >= now() - interval '30 days'
    AND c.km_end IS NOT NULL
    AND c.km_start IS NOT NULL
    AND (c.km_end - c.km_start) > 0;

  -- Si pas de données historiques, utiliser une moyenne par défaut (ex: 100 FCFA/km)
  IF v_avg_revenue_per_km IS NULL OR v_avg_revenue_per_km = 0 THEN
    v_avg_revenue_per_km := 100;
  END IF;

  -- Calculer la recette attendue
  v_expected_revenue := (v_km_total * v_avg_revenue_per_km)::int;

  -- Mettre à jour la clôture si elle existe
  UPDATE clotures_creneaux
  SET 
    expected_revenue = v_expected_revenue,
    revenue_gap = revenue_declared - v_expected_revenue
  WHERE shift_id = p_shift_id;

  RETURN v_expected_revenue;
END;
$$;

-- Fonction : generer_alertes_automatiques
CREATE OR REPLACE FUNCTION generer_alertes_automatiques(
  p_fleet_id uuid
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alert_count int := 0;
  v_shift_record record;
  v_driver_record record;
  v_vehicle_record record;
BEGIN
  -- 1. Détecter les clôtures manquantes (créneaux fermés sans clôture depuis 24h)
  FOR v_shift_record IN
    SELECT c.id as shift_id, a.driver_user_id, a.vehicle_id
    FROM creneaux_conducteurs c
    JOIN affectations_vehicules a ON a.id = c.assignment_id
    LEFT JOIN clotures_creneaux cc ON cc.shift_id = c.id
    WHERE a.fleet_id = p_fleet_id
      AND c.status = 'closed'
      AND c.ended_at < now() - interval '24 hours'
      AND cc.id IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM alertes_automatiques aa
        WHERE aa.shift_id = c.id
          AND aa.alert_type = 'missing_closure'
          AND aa.resolved = false
      )
  LOOP
    INSERT INTO alertes_automatiques (
      fleet_id, alert_type, driver_user_id, vehicle_id, shift_id,
      severity, message, resolved
    ) VALUES (
      p_fleet_id, 'missing_closure', v_shift_record.driver_user_id, 
      v_shift_record.vehicle_id, v_shift_record.shift_id,
      'high', 'Clôture manquante pour un créneau fermé depuis plus de 24h', false
    );
    v_alert_count := v_alert_count + 1;
  END LOOP;

  -- 2. Détecter les écarts récurrents (chauffeurs avec 3+ écarts négatifs significatifs sur 30 jours)
  FOR v_driver_record IN
    SELECT DISTINCT a.driver_user_id
    FROM affectations_vehicules a
    JOIN creneaux_conducteurs c ON c.assignment_id = a.id
    JOIN clotures_creneaux cc ON cc.shift_id = c.id
    WHERE a.fleet_id = p_fleet_id
      AND cc.status = 'validated'
      AND cc.revenue_gap IS NOT NULL
      AND cc.revenue_gap < 0
      AND ABS(cc.revenue_gap) > (cc.expected_revenue * 0.15) -- Écart > 15%
      AND cc.created_at >= now() - interval '30 days'
    GROUP BY a.driver_user_id
    HAVING COUNT(*) >= 3
      AND NOT EXISTS (
        SELECT 1 FROM alertes_automatiques aa
        WHERE aa.driver_user_id = a.driver_user_id
          AND aa.alert_type = 'recurring_gap'
          AND aa.resolved = false
          AND aa.created_at >= now() - interval '7 days'
      )
  LOOP
    INSERT INTO alertes_automatiques (
      fleet_id, alert_type, driver_user_id,
      severity, message, resolved
    ) VALUES (
      p_fleet_id, 'recurring_gap', v_driver_record.driver_user_id,
      'medium', 'Écarts récurrents détectés sur les recettes déclarées', false
    );
    v_alert_count := v_alert_count + 1;
  END LOOP;

  -- 3. Détecter les chauffeurs à risque (score rouge)
  FOR v_driver_record IN
    SELECT driver_user_id
    FROM scores_conducteurs
    WHERE fleet_id = p_fleet_id
      AND score_level = 'red'
      AND last_calculated_at >= now() - interval '7 days'
      AND NOT EXISTS (
        SELECT 1 FROM alertes_automatiques aa
        WHERE aa.driver_user_id = scores_conducteurs.driver_user_id
          AND aa.alert_type = 'risky_driver'
          AND aa.resolved = false
          AND aa.created_at >= now() - interval '7 days'
      )
  LOOP
    INSERT INTO alertes_automatiques (
      fleet_id, alert_type, driver_user_id,
      severity, message, resolved
    ) VALUES (
      p_fleet_id, 'risky_driver', v_driver_record.driver_user_id,
      'high', 'Chauffeur à risque détecté (score rouge)', false
    );
    v_alert_count := v_alert_count + 1;
  END LOOP;

  -- 4. Détecter les véhicules bloqués depuis plus de 7 jours
  FOR v_vehicle_record IN
    SELECT v.id as vehicle_id
    FROM vehicules v
    WHERE v.fleet_id = p_fleet_id
      AND v.status = 'blocked'
      AND v.created_at < now() - interval '7 days'
      AND NOT EXISTS (
        SELECT 1 FROM alertes_automatiques aa
        WHERE aa.vehicle_id = v.id
          AND aa.alert_type = 'vehicle_blocked'
          AND aa.resolved = false
          AND aa.created_at >= now() - interval '7 days'
      )
  LOOP
    INSERT INTO alertes_automatiques (
      fleet_id, alert_type, vehicle_id,
      severity, message, resolved
    ) VALUES (
      p_fleet_id, 'vehicle_blocked', v_vehicle_record.vehicle_id,
      'medium', 'Véhicule bloqué depuis plus de 7 jours', false
    );
    v_alert_count := v_alert_count + 1;
  END LOOP;

  RETURN v_alert_count;
END;
$$;

-- Accorder les permissions d'exécution
GRANT EXECUTE ON FUNCTION calculer_score_conducteur(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION calculer_recette_attendue(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION generer_alertes_automatiques(uuid) TO authenticated;

COMMIT;
