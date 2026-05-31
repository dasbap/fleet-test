-- =====================================================
-- Diagnostic schéma : public.affectations_vehicules
-- E-Samba / Smart Fleet Africa
-- =====================================================
-- Idempotent, sans effet de bord destructif (lectures + assertions).
-- Compatible Supabase SQL Editor.
--
-- Colonnes canoniques :
--   fleet_id, vehicle_id, driver_user_id, starts_at, ends_at,
--   is_active, created_by, created_at
--
-- Noms obsolètes (ne pas utiliser comme colonnes) :
--   flotte_id, pilote_user_id, conducteur_user_id, driver_id
-- =====================================================

SELECT '=== DIAGNOSTIC affectations_vehicules ===' AS rapport;

-- ── Bloc A : information_schema ─────────────────────────────────────────────

SELECT
  'SCHEMA_COLONNES' AS section,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'affectations_vehicules'
ORDER BY ordinal_position;

-- ── Bloc B : colonnes obligatoires ──────────────────────────────────────────

DO $$
DECLARE
  v_col text;
  v_attendues text[] := ARRAY[
    'id',
    'fleet_id',
    'vehicle_id',
    'driver_user_id',
    'starts_at',
    'is_active',
    'created_by',
    'created_at'
  ];
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

  RAISE NOTICE 'OK: colonnes obligatoires présentes sur affectations_vehicules';
END $$;

-- ── Bloc C : colonnes obsolètes (dérive schéma) ─────────────────────────────

DO $$
DECLARE
  v_obsolete text;
  v_obsoletes text[] := ARRAY[
    'flotte_id',
    'pilote_user_id',
    'conducteur_user_id',
    'driver_id'
  ];
BEGIN
  FOREACH v_obsolete IN ARRAY v_obsoletes
  LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'affectations_vehicules'
        AND column_name = v_obsolete
    ) THEN
      RAISE EXCEPTION
        'Colonne obsolète encore présente: affectations_vehicules.% (renommer vers fleet_id / driver_user_id via migration)',
        v_obsolete;
    END IF;
  END LOOP;

  RAISE NOTICE 'OK: aucune colonne obsolète sur affectations_vehicules';
END $$;

-- ── Bloc D : requêtes de test (lecture seule) ───────────────────────────────

SELECT
  'STATS_AFFECTATIONS' AS section,
  count(*)::bigint AS total,
  count(*) FILTER (WHERE is_active = true)::bigint AS actives,
  count(*) FILTER (WHERE is_active = false)::bigint AS inactives
FROM public.affectations_vehicules;

SELECT
  'JOINTURE_FLOTTE_VEHICULE' AS section,
  av.id AS assignment_id,
  av.fleet_id,
  f.name AS fleet_name,
  av.vehicle_id,
  v.registration,
  av.driver_user_id,
  av.is_active
FROM public.affectations_vehicules av
INNER JOIN public.flottes f ON f.id = av.fleet_id
INNER JOIN public.vehicules v ON v.id = av.vehicle_id
ORDER BY av.created_at DESC
LIMIT 5;

SELECT
  'FILTRE_CONDUCTEUR' AS section,
  id,
  fleet_id,
  vehicle_id,
  driver_user_id,
  is_active
FROM public.affectations_vehicules
WHERE driver_user_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

-- ── Bloc E (optionnel) : gabarit CRUD en rollback ───────────────────────────
-- Décommenter pour valider la syntaxe INSERT/UPDATE/DELETE sans persister.

/*
DO $$
DECLARE
  v_fleet_id uuid;
  v_vehicle_id uuid;
  v_driver_id uuid;
  v_creator_id uuid;
  v_assignment_id uuid;
BEGIN
  SELECT f.id, v.id, fa.user_id, fa.user_id
  INTO v_fleet_id, v_vehicle_id, v_driver_id, v_creator_id
  FROM public.flottes f
  INNER JOIN public.vehicules v ON v.fleet_id = f.id
  INNER JOIN public.flotte_adhesions fa ON fa.fleet_id = f.id AND fa.is_active = true
  WHERE fa.role = 'driver'::public.role_type
  LIMIT 1;

  IF v_fleet_id IS NULL THEN
    RAISE NOTICE 'SKIP CRUD test: aucune flotte/véhicule/conducteur disponible';
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
    v_driver_id,
    now(),
    false,
    v_creator_id
  )
  RETURNING id INTO v_assignment_id;

  UPDATE public.affectations_vehicules
  SET ends_at = now()
  WHERE id = v_assignment_id;

  DELETE FROM public.affectations_vehicules
  WHERE id = v_assignment_id;

  RAISE EXCEPTION 'ROLLBACK_CRUD_TEST';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLERRM <> 'ROLLBACK_CRUD_TEST' THEN
      RAISE;
    END IF;
    RAISE NOTICE 'OK: gabarit CRUD validé (transaction annulée)';
END $$;
*/

SELECT '=== FIN DIAGNOSTIC affectations_vehicules ===' AS rapport;
