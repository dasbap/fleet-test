-- =====================================================
-- Référence CRUD : public.affectations_vehicules (colonnes corrigées)
-- E-Samba / Smart Fleet Africa
-- =====================================================
-- Idempotent : lectures + exemples commentés. Pas de placeholders <uuid>.
--
-- Correspondance obsolète → réel (colonnes TABLE uniquement) :
--   flotte_id          → fleet_id
--   pilote_user_id     → driver_user_id
--   conducteur_user_id → driver_user_id
--   driver_id          → driver_user_id
--
-- Les paramètres RPC français (p_flotte_id, p_conducteur_utilisateur_id)
-- restent valides dans affecter_vehicule (anciennes signatures) ; ils
-- alimentent les colonnes fleet_id et driver_user_id.
-- =====================================================

-- ── SELECT : affectations actives avec flotte et immatriculation ────────────

SELECT
  av.id,
  av.fleet_id,
  f.name AS fleet_name,
  av.vehicle_id,
  v.registration,
  av.driver_user_id,
  av.starts_at,
  av.ends_at,
  av.is_active
FROM public.affectations_vehicules av
INNER JOIN public.flottes f ON f.id = av.fleet_id
INNER JOIN public.vehicules v ON v.id = av.vehicle_id
WHERE av.is_active = true
ORDER BY av.starts_at DESC
LIMIT 20;

-- ── SELECT : conducteur déjà affecté (garde métier) ─────────────────────────

SELECT id, fleet_id, vehicle_id, driver_user_id
FROM public.affectations_vehicules
WHERE driver_user_id IS NOT NULL
  AND is_active = true;

-- ── INSERT manuel (préférer RPC affecter_vehicule en production) ──────────────
-- Décommenter et adapter si besoin de seed ; résolution dynamique des UUID.

/*
DO $$
DECLARE
  v_fleet_id uuid;
  v_vehicle_id uuid;
  v_driver_user_id uuid;
  v_created_by uuid;
  v_new_id uuid;
BEGIN
  SELECT f.id INTO v_fleet_id FROM public.flottes f LIMIT 1;
  SELECT v.id INTO v_vehicle_id
  FROM public.vehicules v
  WHERE v.fleet_id = v_fleet_id
  LIMIT 1;
  SELECT fa.user_id INTO v_driver_user_id
  FROM public.flotte_adhesions fa
  WHERE fa.fleet_id = v_fleet_id
    AND fa.role = 'driver'::public.role_type
    AND fa.is_active = true
  LIMIT 1;
  v_created_by := COALESCE(auth.uid(), v_driver_user_id);

  IF v_fleet_id IS NULL OR v_vehicle_id IS NULL OR v_driver_user_id IS NULL THEN
    RAISE NOTICE 'SKIP INSERT: données flotte/véhicule/conducteur insuffisantes';
    RETURN;
  END IF;

  INSERT INTO public.affectations_vehicules (
    fleet_id,
    vehicle_id,
    driver_user_id,
    starts_at,
    is_active,
    created_by
  )
  VALUES (
    v_fleet_id,
    v_vehicle_id,
    v_driver_user_id,
    now(),
    true,
    v_created_by
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_new_id;

  RAISE NOTICE 'Affectation créée: %', v_new_id;
END $$;
*/

-- ── RPC recommandée : affecter_vehicule ─────────────────────────────────────
-- Signature courante (paramètres anglais) :

/*
SELECT public.affecter_vehicule(
  p_fleet_id := (SELECT id FROM public.flottes LIMIT 1),
  p_vehicle_id := (SELECT id FROM public.vehicules WHERE fleet_id = (SELECT id FROM public.flottes LIMIT 1) LIMIT 1),
  p_driver_user_id := (
    SELECT user_id FROM public.flotte_adhesions
    WHERE fleet_id = (SELECT id FROM public.flottes LIMIT 1)
      AND role = 'driver'::public.role_type AND is_active = true
    LIMIT 1
  ),
  p_starts_at := now()
);
*/

-- ── UPDATE : clôturer une affectation (désactivation) ───────────────────────

/*
UPDATE public.affectations_vehicules
SET
  is_active = false,
  ends_at = COALESCE(ends_at, now())
WHERE id = (
  SELECT id FROM public.affectations_vehicules
  WHERE is_active = true
  ORDER BY created_at DESC
  LIMIT 1
);
*/

-- ── DELETE : orphelin sans créneau (maintenance uniquement) ─────────────────

/*
DELETE FROM public.affectations_vehicules av
WHERE av.is_active = false
  AND NOT EXISTS (
    SELECT 1 FROM public.creneaux_conducteurs cc
    WHERE cc.assignment_id = av.id
  );
*/

SELECT 'repair-affectations-vehicules-queries: lectures OK (voir blocs commentés pour CRUD)' AS rapport;
