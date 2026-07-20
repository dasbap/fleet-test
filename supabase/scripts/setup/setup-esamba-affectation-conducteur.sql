-- =====================================================
-- Affectation conducteur ↔ véhicule — Flotte ESAMBA
-- Smart Fleet Africa / E-Samba
-- =====================================================
-- Idempotent, compatible Supabase SQL Editor (rôle postgres).
-- Prérequis : setup-esamba-complete.sql (org, flotte, véhicule, adhésion driver).
--
-- Colonnes TABLE (canoniques) :
--   fleet_id, vehicle_id, driver_user_id, starts_at, ends_at,
--   is_active, created_by, created_at
--
-- Noms obsolètes — ne pas utiliser comme colonnes :
--   flotte_id → fleet_id
--   pilote_user_id, conducteur_user_id, driver_id → driver_user_id
--
-- En production (session authentifiée), préférer :
--   SELECT public.affecter_vehicule(p_fleet_id, p_vehicle_id, p_driver_user_id, p_starts_at);
-- (p_flotte_id / p_conducteur_utilisateur_id = anciens noms de paramètres RPC uniquement)
-- =====================================================

-- Constantes alignées sur src/constants/esamba-demo.constants.ts
-- Flotte : Flotte ESAMBA | Véhicule : ESAMBA-001

SELECT '=== SETUP ESAMBA : affectation conducteur ↔ véhicule ===' AS rapport;

-- ── Diagnostic rapide (information_schema) ────────────────────────────────────

SELECT
  'SCHEMA_COLONNES' AS section,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'affectations_vehicules'
ORDER BY ordinal_position;

DO $$
DECLARE
  v_col text;
  v_attendues text[] := ARRAY['fleet_id', 'driver_user_id', 'vehicle_id'];
BEGIN
  IF to_regclass('public.affectations_vehicules') IS NULL THEN
    RAISE EXCEPTION 'Table manquante: public.affectations_vehicules';
  END IF;

  FOREACH v_col IN ARRAY v_attendues
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'affectations_vehicules'
        AND column_name = v_col
    ) THEN
      RAISE EXCEPTION 'Colonne obligatoire manquante: affectations_vehicules.%', v_col;
    END IF;
  END LOOP;

  RAISE NOTICE 'OK: schéma affectations_vehicules (fleet_id, driver_user_id, vehicle_id)';
END $$;

-- ── Seed idempotent ─────────────────────────────────────────────────────────

DO $$
DECLARE
  v_fleet_name constant text := 'Flotte ESAMBA';
  v_vehicle_registration constant text := 'ESAMBA-001';
  v_fleet_id uuid;
  v_vehicle_id uuid;
  v_driver_user_id uuid;
  v_created_by uuid;
  v_assignment_id uuid;
BEGIN
  SELECT f.id INTO v_fleet_id
  FROM public.flottes f
  WHERE f.name = v_fleet_name
  LIMIT 1;

  IF v_fleet_id IS NULL THEN
    RAISE NOTICE 'SKIP: flotte "%" introuvable — exécuter setup-esamba-complete.sql', v_fleet_name;
    RETURN;
  END IF;

  SELECT v.id INTO v_vehicle_id
  FROM public.vehicules v
  WHERE v.fleet_id = v_fleet_id
    AND v.registration = v_vehicle_registration
  LIMIT 1;

  IF v_vehicle_id IS NULL THEN
    RAISE NOTICE 'SKIP: véhicule "%" introuvable sur la flotte %', v_vehicle_registration, v_fleet_id;
    RETURN;
  END IF;

  SELECT fa.user_id INTO v_driver_user_id
  FROM public.flotte_adhesions fa
  WHERE fa.fleet_id = v_fleet_id
    AND fa.role = 'driver'::public.role_type
    AND fa.is_active = true
  ORDER BY fa.created_at ASC
  LIMIT 1;

  IF v_driver_user_id IS NULL THEN
    RAISE NOTICE 'SKIP: aucun conducteur actif sur "%" — assigner le rôle driver via flotte_adhesions', v_fleet_name;
    RETURN;
  END IF;

  v_created_by := COALESCE(auth.uid(), v_driver_user_id);

  -- Idempotence : un conducteur ne peut avoir qu''une affectation active (index partiel)
  IF EXISTS (
    SELECT 1
    FROM public.affectations_vehicules av
    WHERE av.driver_user_id = v_driver_user_id
      AND av.is_active = true
  ) THEN
    RAISE NOTICE 'SKIP: conducteur % a déjà une affectation active', v_driver_user_id;
    RETURN;
  END IF;

  -- Idempotence : même triplet flotte / véhicule / conducteur actif
  IF EXISTS (
    SELECT 1
    FROM public.affectations_vehicules av
    WHERE av.fleet_id = v_fleet_id
      AND av.vehicle_id = v_vehicle_id
      AND av.driver_user_id = v_driver_user_id
      AND av.is_active = true
  ) THEN
    RAISE NOTICE 'SKIP: affectation active déjà présente (flotte %, véhicule %, conducteur %)',
      v_fleet_id, v_vehicle_id, v_driver_user_id;
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
  RETURNING id INTO v_assignment_id;

  RAISE NOTICE '✅ Affectation créée: % (flotte %, % → conducteur %)',
    v_assignment_id, v_fleet_id, v_vehicle_registration, v_driver_user_id;
END $$;

-- ── Rapport : affectations actives Flotte ESAMBA ────────────────────────────

SELECT
  'AFFECTATIONS_ACTIVES_ESAMBA' AS section,
  av.id AS assignment_id,
  av.fleet_id,
  f.name AS fleet_name,
  av.vehicle_id,
  v.registration,
  av.driver_user_id,
  p.full_name AS conducteur,
  av.starts_at,
  av.is_active
FROM public.affectations_vehicules av
INNER JOIN public.flottes f ON f.id = av.fleet_id
INNER JOIN public.vehicules v ON v.id = av.vehicle_id
LEFT JOIN public.profils p ON p.user_id = av.driver_user_id
WHERE f.name = 'Flotte ESAMBA'
  AND av.is_active = true
ORDER BY av.starts_at DESC;

-- ── Rapport : conducteurs avec / sans affectation active ──────────────────────

SELECT
  'CONDUCTEURS_AFFECTATION_ESAMBA' AS section,
  (SELECT count(DISTINCT fa.user_id)::bigint
   FROM public.flotte_adhesions fa
   INNER JOIN public.flottes f ON f.id = fa.fleet_id
   WHERE f.name = 'Flotte ESAMBA'
     AND fa.is_active = true
     AND fa.role = 'driver'::public.role_type
  ) AS conducteurs_inscrits,
  (SELECT count(DISTINCT av.driver_user_id)::bigint
   FROM public.affectations_vehicules av
   INNER JOIN public.flottes f ON f.id = av.fleet_id
   WHERE f.name = 'Flotte ESAMBA'
     AND av.is_active = true
     AND EXISTS (
       SELECT 1 FROM public.flotte_adhesions fa2
       WHERE fa2.user_id = av.driver_user_id
         AND fa2.fleet_id = av.fleet_id
         AND fa2.is_active = true
         AND fa2.role = 'driver'::public.role_type
     )
  ) AS conducteurs_avec_affectation_active,
  (SELECT count(DISTINCT fa.user_id)::bigint
   FROM public.flotte_adhesions fa
   INNER JOIN public.flottes f ON f.id = fa.fleet_id
   WHERE f.name = 'Flotte ESAMBA'
     AND fa.is_active = true
     AND fa.role = 'driver'::public.role_type
     AND NOT EXISTS (
       SELECT 1
       FROM public.affectations_vehicules av
       WHERE av.driver_user_id = fa.user_id
         AND av.fleet_id = fa.fleet_id
         AND av.is_active = true
     )
  ) AS conducteurs_sans_affectation_active;

SELECT '=== FIN setup-esamba-affectation-conducteur ===' AS rapport;
