-- =====================================================
-- Schéma affectations_vehicules : colonnes canoniques
-- =====================================================

DO $$
DECLARE
  v_col text;
  v_obsolete text;
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
  v_obsoletes text[] := ARRAY[
    'flotte_id',
    'pilote_user_id',
    'conducteur_user_id',
    'driver_id'
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
      RAISE EXCEPTION 'Colonne manquante: affectations_vehicules.%', v_col;
    END IF;
  END LOOP;

  FOREACH v_obsolete IN ARRAY v_obsoletes
  LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'affectations_vehicules'
        AND column_name = v_obsolete
    ) THEN
      RAISE EXCEPTION 'Colonne obsolète présente: affectations_vehicules.%', v_obsolete;
    END IF;
  END LOOP;
END $$;

-- Jointure minimale : les FK logiques fleet_id / vehicle_id doivent être utilisables
SELECT 1
FROM public.affectations_vehicules av
INNER JOIN public.flottes f ON f.id = av.fleet_id
INNER JOIN public.vehicules v ON v.id = av.vehicle_id
WHERE av.driver_user_id IS NOT NULL
LIMIT 1;
