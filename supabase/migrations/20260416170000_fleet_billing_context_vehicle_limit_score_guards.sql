-- =====================================================
-- Contexte facturation flotte (hybride abonnement + défaut free)
-- Plafond véhicules, garde-fous score sur affecter_vehicule
-- =====================================================

BEGIN;

-- Limites et fonctionnalités par plan (le plan "free" est la référence produit)
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS max_vehicles integer;

ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS enables_finance boolean NOT NULL DEFAULT true;

ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS enables_ai boolean NOT NULL DEFAULT true;

-- Plan gratuit : 3 véhicules max, pas de finance / IA applicative
INSERT INTO public.plans (code, name, price_per_vehicle, min_commitment_days, is_active, max_vehicles, enables_finance, enables_ai)
VALUES ('free', 'Gratuit', 0, 0, true, 3, false, false)
ON CONFLICT (code) DO UPDATE SET
  max_vehicles = EXCLUDED.max_vehicles,
  enables_finance = EXCLUDED.enables_finance,
  enables_ai = EXCLUDED.enables_ai,
  name = EXCLUDED.name;

-- Plans payants existants : pas de plafond côté app si NULL (illimité)
UPDATE public.plans
SET enables_finance = true,
    enables_ai = COALESCE(enables_ai, true)
WHERE code <> 'free';

-- ---------------------------------------------------------------------------
-- Contexte facturation : abonnement actif si présent, sinon plan implicite "free"
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_fleet_billing_context(p_fleet_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vehicle_count int;
  v_plan_code text;
  v_max_vehicles int;
  v_finance boolean;
  v_ai boolean;
  v_is_paid boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  IF NOT (
    public.has_role(p_fleet_id, 'organizer')
    OR public.has_role(p_fleet_id, 'manager')
    OR public.has_role(p_fleet_id, 'mechanic')
    OR public.has_role(p_fleet_id, 'driver')
  ) THEN
    RAISE EXCEPTION 'Accès refusé pour cette flotte';
  END IF;

  SELECT COUNT(*)::int
  INTO v_vehicle_count
  FROM public.vehicules v
  WHERE v.fleet_id = p_fleet_id;

  SELECT p.code, p.max_vehicles, p.enables_finance, p.enables_ai
  INTO v_plan_code, v_max_vehicles, v_finance, v_ai
  FROM public.abonnements a
  INNER JOIN public.plans p ON p.id = a.plan_id
  WHERE a.fleet_id = p_fleet_id
    AND a.status = 'active'
    AND a.starts_at <= now()
    AND a.ends_at >= now()
  ORDER BY a.ends_at DESC
  LIMIT 1;

  IF v_plan_code IS NULL THEN
    v_plan_code := 'free';
    v_max_vehicles := 3;
    v_finance := false;
    v_ai := false;
    v_is_paid := false;
  ELSE
    v_is_paid := v_plan_code <> 'free';
    IF v_plan_code = 'free' THEN
      v_max_vehicles := COALESCE(v_max_vehicles, 3);
      v_finance := false;
      v_ai := false;
    ELSE
      v_finance := COALESCE(v_finance, true);
      v_ai := COALESCE(v_ai, true);
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'plan_code', v_plan_code,
    'is_paid', v_is_paid,
    'vehicle_count', v_vehicle_count,
    'max_vehicles', COALESCE(v_max_vehicles, 999999),
    'finance_enabled', v_finance,
    'ai_enabled', v_ai
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_fleet_billing_context(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_fleet_billing_context(uuid) IS
  'Hybride : abonnement actif + plan, sinon plan implicite free (3 véhicules, sans finance/IA).';

-- ---------------------------------------------------------------------------
-- Plafond véhicules (INSERT)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_enforce_fleet_vehicle_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ctx jsonb;
  v_max int;
  v_cnt int;
BEGIN
  SELECT public.get_fleet_billing_context(NEW.fleet_id) INTO v_ctx;
  v_max := COALESCE((v_ctx->>'max_vehicles')::int, 999999);

  IF v_max >= 999999 THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*)::int INTO v_cnt FROM public.vehicules WHERE fleet_id = NEW.fleet_id;

  IF v_cnt + 1 > v_max THEN
    RAISE EXCEPTION 'limite_vehicules_plan_atteinte';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vehicules_enforce_plan_limit ON public.vehicules;
CREATE TRIGGER trg_vehicules_enforce_plan_limit
  BEFORE INSERT ON public.vehicules
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_enforce_fleet_vehicle_limit();

-- ---------------------------------------------------------------------------
-- Affectation : paramètres alignés frontend + scores conducteur (60 / 40)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.affecter_vehicule(uuid, uuid, uuid, timestamptz);

CREATE OR REPLACE FUNCTION public.affecter_vehicule(
  p_fleet_id uuid,
  p_vehicle_id uuid,
  p_driver_user_id uuid,
  p_starts_at timestamptz DEFAULT now()
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vehicule public.vehicules%ROWTYPE;
  v_affectation_id uuid;
  v_score numeric;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'non_authentifie';
  END IF;

  SELECT * INTO v_vehicule
  FROM public.vehicules
  WHERE id = p_vehicle_id AND fleet_id = p_fleet_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'vehicule_non_trouve';
  END IF;

  IF v_vehicule.status = 'blocked' THEN
    RAISE EXCEPTION 'vehicule_bloque';
  END IF;

  SELECT COALESCE(sc.score_total, sc.financial_score::numeric)
  INTO v_score
  FROM public.scores_conducteurs sc
  WHERE sc.fleet_id = p_fleet_id
    AND sc.driver_user_id = p_driver_user_id
  LIMIT 1;

  IF v_score IS NOT NULL THEN
    IF v_score < 40 THEN
      RAISE EXCEPTION 'conducteur_score_suspendu_affectation';
    END IF;
    IF v_score < 60 THEN
      RAISE EXCEPTION 'conducteur_score_restreint_affectation';
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.affectations_vehicules a
    JOIN public.creneaux_conducteurs c ON c.assignment_id = a.id
    LEFT JOIN public.clotures_creneaux cl ON cl.shift_id = c.id
    WHERE a.vehicle_id = p_vehicle_id
      AND a.is_active = false
      AND c.status = 'closed'
      AND cl.id IS NULL
      AND c.ended_at > now() - interval '7 days'
  ) THEN
    RAISE EXCEPTION 'cloture_manquante_bloque_affectation';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.affectations_vehicules
    WHERE driver_user_id = p_driver_user_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'conducteur_deja_affecte';
  END IF;

  INSERT INTO public.affectations_vehicules(fleet_id, vehicle_id, driver_user_id, starts_at, created_by)
  VALUES (p_fleet_id, p_vehicle_id, p_driver_user_id, p_starts_at, auth.uid())
  RETURNING id INTO v_affectation_id;

  RETURN v_affectation_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.affecter_vehicule(uuid, uuid, uuid, timestamptz) TO authenticated;

COMMENT ON FUNCTION public.affecter_vehicule(uuid, uuid, uuid, timestamptz) IS
  'Affecte un véhicule ; vérifie clôture manquante, score conducteur (<60 restreint, <40 suspendu), doublons.';

COMMIT;
