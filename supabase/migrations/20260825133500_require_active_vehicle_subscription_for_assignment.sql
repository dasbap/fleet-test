BEGIN;

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
  v_scoring boolean := true;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'non_authentifie';
  END IF;

  IF to_regprocedure('public.get_fleet_billing_context(uuid)') IS NOT NULL THEN
    SELECT (public.get_fleet_billing_context(p_fleet_id)->>'driver_scoring_enabled')::boolean
    INTO v_scoring;
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

  IF NOT EXISTS (
    SELECT 1
    FROM public.droits_vehicules dv
    JOIN public.abonnements a ON a.id = dv.subscription_id
    WHERE dv.vehicle_id = p_vehicle_id
      AND dv.active IS TRUE
      AND dv.status = 'active'
      AND dv.starts_at <= now()
      AND dv.ends_at >= now()
      AND a.fleet_id = p_fleet_id
      AND a.status = 'active'
      AND a.starts_at <= now()
      AND a.ends_at >= now()
  ) THEN
    RAISE EXCEPTION 'vehicule_sans_abonnement_actif';
  END IF;

  IF v_scoring IS TRUE AND to_regclass('public.scores_conducteurs') IS NOT NULL THEN
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
  END IF;

  IF to_regclass('public.creneaux_conducteurs') IS NOT NULL
    AND to_regclass('public.clotures_creneaux') IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.affectations_vehicules a
      JOIN public.creneaux_conducteurs c ON c.assignment_id = a.id
      LEFT JOIN public.clotures_creneaux cl ON cl.shift_id = c.id
      WHERE a.vehicle_id = p_vehicle_id
        AND a.is_active = false
        AND c.status = 'closed'
        AND cl.id IS NULL
        AND c.ended_at > now() - interval '7 days'
    )
  THEN
    RAISE EXCEPTION 'cloture_manquante_bloque_affectation';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.affectations_vehicules
    WHERE driver_user_id = p_driver_user_id
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'conducteur_deja_affecte';
  END IF;

  INSERT INTO public.affectations_vehicules(
    fleet_id,
    vehicle_id,
    driver_user_id,
    starts_at,
    created_by
  )
  VALUES (
    p_fleet_id,
    p_vehicle_id,
    p_driver_user_id,
    p_starts_at,
    auth.uid()
  )
  RETURNING id INTO v_affectation_id;

  RETURN v_affectation_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.affecter_vehicule(uuid, uuid, uuid, timestamptz) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.affecter_vehicule(uuid, uuid, uuid, timestamptz) FROM anon;

NOTIFY pgrst, 'reload schema';

COMMIT;
